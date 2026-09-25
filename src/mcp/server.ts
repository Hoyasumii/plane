import { timingSafeEqual } from "node:crypto";
import { IncomingMessage, Server, ServerResponse, createServer } from "node:http";
import { AddressInfo } from "node:net";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { PlaneClient } from "../client/plane-client";
import { buildPlaneMcpServer } from "./build";
import { createPlaneMcpRuntime } from "./runtime";

export interface PlaneMcpServerOptions {
  /** Port to listen on, on 127.0.0.1. `0` picks a free one; read it back from `url`. */
  port: number;
  /** The Plane instance, e.g. `https://api.plane.so` or a self-hosted URL. */
  baseUrl: string;
  /** A Plane API key (sent as `X-Api-Key`). */
  apiKey: string;
  /** A default workspace slug, used by every tool call that omits `slug`. */
  workspace?: string;
  /** When set, `POST /shutdown` with header `X-Plane-Shutdown: <token>` closes the server, or calls {@link onShutdown}. */
  shutdownToken?: string;
  /**
   * Called after `/shutdown` has answered 202, in place of the default, which closes the server.
   * Set it to leave the process as well, or to close anything else first.
   */
  onShutdown?: () => void;
}

export interface RunningPlaneMcpServer {
  /** The MCP endpoint, e.g. `http://127.0.0.1:3766/mcp`. */
  url: string;
  port: number;
  /** Stop accepting connections and close the listener; later calls answer the first one's promise. */
  close(): Promise<void>;
}

const MCP_PATH = "/mcp";
const HEALTH_PATH = "/health";
const SHUTDOWN_PATH = "/shutdown";
/** Host names a request may name: the listener is loopback-only, and DNS rebinding would name another. */
const ALLOWED_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);
const MAX_BODY_BYTES = 4 * 1024 * 1024;

function validate(options: PlaneMcpServerOptions): void {
  const { port } = options ?? ({} as PlaneMcpServerOptions);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new RangeError(`port must be an integer from 0 to 65535 (received ${String(port)}).`);
  }
  validateConnection(options);
}

/** The Plane URL and key every transport needs: a parseable `baseUrl` and a non-blank `apiKey`. */
export function validateConnection(options: { baseUrl: string; apiKey: string }): void {
  const { baseUrl, apiKey } = options ?? ({} as { baseUrl: string; apiKey: string });
  if (typeof baseUrl !== "string" || baseUrl.trim() === "") {
    throw new TypeError("baseUrl is required, e.g. 'https://api.plane.so'.");
  }
  try {
    new URL(baseUrl);
  } catch {
    throw new TypeError(`baseUrl is not a valid URL: '${baseUrl}'.`);
  }
  if (typeof apiKey !== "string" || apiKey.trim() === "") {
    throw new TypeError("apiKey is required.");
  }
}

/** Whether a `Host` header names this loopback listener (any port). */
export function hostAllowed(host: string | undefined): boolean {
  if (!host) return false;
  const name = host.startsWith("[") ? host.slice(0, host.indexOf("]") + 1) : host.split(":")[0];
  return ALLOWED_HOSTS.has(name.toLowerCase());
}

/** Constant-time comparison, so the token cannot be guessed byte by byte from response times. */
function tokenMatches(expected: string | undefined, given: string | string[] | undefined): boolean {
  if (!expected || typeof given !== "string") return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify(body));
}

function rpcError(res: ServerResponse, status: number, code: number, message: string): void {
  sendJson(res, status, { jsonrpc: "2.0", error: { code, message }, id: null });
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new RangeError("Request body too large.");
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

/**
 * Build the Plane MCP server and serve it over Streamable HTTP at `http://127.0.0.1:<port>/mcp`.
 *
 * Stateless: every POST gets a fresh server and transport, so there is no session to
 * leak or expire; the v1 cache and the API-version probe are shared across them. Requests
 * whose `Host` is not `127.0.0.1`/`localhost` are refused (DNS rebinding), and
 * `GET /health` answers `{ ok, workspace, api }`. Resolves once the port is bound; rejects if it cannot be (e.g. in use).
 *
 * ```ts
 * import { startPlaneMcpServer } from "@hoyasumii/plane/mcp";
 * const mcp = await startPlaneMcpServer({ port: 3766, baseUrl: "https://api.plane.so", apiKey: "plane_api_…" });
 * // claude mcp add --transport http plane http://127.0.0.1:3766/mcp
 * ```
 */
export async function startPlaneMcpServer(options: PlaneMcpServerOptions): Promise<RunningPlaneMcpServer> {
  validate(options);
  const client = new PlaneClient({ baseUrl: options.baseUrl, apiKey: options.apiKey });
  // One per process: every POST shares the v1 cache and the API-version probe.
  const runtime = createPlaneMcpRuntime(client);
  const workspace = options.workspace || undefined;

  const handle = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    if (!hostAllowed(req.headers.host)) {
      sendJson(res, 403, { error: "Forbidden host. The MCP server only answers requests to 127.0.0.1 or localhost." });
      return;
    }
    const { pathname } = new URL(req.url ?? "/", "http://localhost");
    if (pathname === HEALTH_PATH && req.method === "GET") {
      const api = await runtime.probe.version().catch(() => "unknown");
      sendJson(res, 200, { ok: true, workspace: workspace ?? null, api });
      return;
    }
    if (pathname === SHUTDOWN_PATH && req.method === "POST") {
      if (!tokenMatches(options.shutdownToken, req.headers["x-plane-shutdown"])) {
        sendJson(res, 403, { error: "Forbidden." });
        return;
      }
      // Only once the 202 is on the wire: closing first would cut the response off.
      res.on("finish", () => (options.onShutdown ? options.onShutdown() : void close().catch(() => undefined)));
      sendJson(res, 202, { ok: true });
      return;
    }
    if (pathname !== MCP_PATH) {
      sendJson(res, 404, { error: `Not found. The MCP endpoint is ${MCP_PATH}.` });
      return;
    }
    if (req.method !== "POST") {
      // Stateless mode has no server-initiated stream (GET) and no session to end (DELETE).
      res.setHeader("Allow", "POST");
      rpcError(res, 405, -32000, "Method not allowed.");
      return;
    }

    let body: unknown;
    try {
      body = await readJson(req);
    } catch (error) {
      rpcError(res, 400, -32700, `Parse error: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }

    const server = buildPlaneMcpServer(client, { workspace, runtime });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, body);
    } catch (error) {
      if (!res.headersSent) {
        rpcError(res, 500, -32603, `Internal error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };

  const http: Server = createServer((req, res) => {
    void handle(req, res);
  });
  let closing: Promise<void> | undefined;
  const close = (): Promise<void> =>
    (closing ??= new Promise<void>((resolve, reject) => {
      http.closeAllConnections();
      http.close((error) => (error ? reject(error) : resolve()));
    }));
  await new Promise<void>((resolve, reject) => {
    http.once("error", reject);
    http.listen(options.port, "127.0.0.1", () => {
      http.off("error", reject);
      resolve();
    });
  });

  const { port } = http.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}${MCP_PATH}`,
    port,
    close,
  };
}
