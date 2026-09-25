import { Readable, Writable } from "node:stream";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { PlaneClient } from "../client/plane-client";
import { buildPlaneMcpServer } from "./build";
import { validateConnection } from "./server";

export interface PlaneMcpStdioOptions {
  /** The Plane instance, e.g. `https://api.plane.so` or a self-hosted URL. */
  baseUrl: string;
  /** A Plane API key (sent as `X-Api-Key`). */
  apiKey: string;
  /** A default workspace slug, used by every tool call that omits `slug`. */
  workspace?: string;
  /** Where requests arrive. Default: `process.stdin`. */
  stdin?: Readable;
  /** Where responses go. Default: `process.stdout` — so nothing else may write to it. */
  stdout?: Writable;
}

export interface RunningPlaneMcpStdio {
  /** Settles once the connection is over: the client closed stdin, or {@link close} was called. */
  closed: Promise<void>;
  /** Stop reading stdin and close the server. */
  close(): Promise<void>;
}

/**
 * Serve the Plane MCP server over stdio: newline-delimited JSON-RPC on stdin/stdout, the way
 * an MCP client runs a server it launched itself.
 *
 * One server for the life of the process, so the v1 cache and the API-version probe live as
 * long as the client keeps it. stdout carries the protocol; log to stderr only. Resolves once
 * connected; `closed` settles when the client closes stdin.
 *
 * ```ts
 * import { servePlaneMcpStdio } from "@hoyasumii/plane/mcp";
 * const mcp = await servePlaneMcpStdio({ baseUrl: "https://api.plane.so", apiKey: "plane_api_…" });
 * await mcp.closed;
 * ```
 */
export async function servePlaneMcpStdio(options: PlaneMcpStdioOptions): Promise<RunningPlaneMcpStdio> {
  validateConnection(options);
  const client = new PlaneClient({ baseUrl: options.baseUrl, apiKey: options.apiKey });
  const server = buildPlaneMcpServer(client, { workspace: options.workspace || undefined });
  const stdin = options.stdin ?? process.stdin;
  const transport = new StdioServerTransport(stdin, options.stdout ?? process.stdout);

  let settle: () => void = () => undefined;
  const closed = new Promise<void>((resolve) => {
    settle = resolve;
  });
  const onEnd = (): void => {
    void server.close();
  };
  server.server.onclose = () => {
    stdin.off("end", onEnd);
    settle();
  };
  stdin.once("end", onEnd);
  await server.connect(transport);

  return {
    closed,
    close: async () => {
      await server.close();
      await closed;
    },
  };
}
