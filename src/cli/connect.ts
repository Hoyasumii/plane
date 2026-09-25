import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { PlaneClient } from "../client/plane-client";
import { SERVER_VERSION, buildPlaneMcpServer } from "../mcp/build";
import { DEFAULT_BASE_URL } from "../mcp/config";

export interface ConnectOptions {
  /** A running `plane-mcp` endpoint, e.g. `http://127.0.0.1:3766/mcp`. Without it the server runs in-process. */
  url?: string;
  /** The Plane instance for the in-process server. */
  baseUrl?: string;
  /** The API key for the in-process server. */
  apiKey?: string;
  /** Default workspace slug for the in-process server. */
  workspace?: string;
}

export interface PlaneMcpConnection {
  client: Client;
  /**
   * Why a tool call cannot succeed yet, when that is known before calling — an in-process
   * server with no API key. Listing tools still works, so `--help` needs no credentials.
   */
  missing?: string;
  close(): Promise<void>;
}

/**
 * An MCP client connected to the Plane MCP server: over Streamable HTTP when `url` is
 * given, otherwise to {@link buildPlaneMcpServer} in this process through an in-memory pair.
 */
export async function connectPlaneMcp(options: ConnectOptions): Promise<PlaneMcpConnection> {
  const client = new Client({ name: "plane-cli", version: SERVER_VERSION });

  if (options.url) {
    let url: URL;
    try {
      url = new URL(options.url);
    } catch {
      throw new TypeError(`--url is not a valid URL: '${options.url}'.`);
    }
    await client.connect(new StreamableHTTPClientTransport(url));
    return { client, close: () => client.close() };
  }

  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  try {
    new URL(baseUrl);
  } catch {
    throw new TypeError(`--base-url is not a valid URL: '${baseUrl}'.`);
  }
  const apiKey = options.apiKey?.trim() ?? "";
  // PlaneClient refuses to exist without a credential; this placeholder never leaves the
  // process, because `missing` stops every tool call before it is made.
  const plane = new PlaneClient({ baseUrl, apiKey: apiKey || "missing" });
  const server = buildPlaneMcpServer(plane, { workspace: options.workspace || undefined });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  await client.connect(clientSide);
  return {
    client,
    missing: apiKey
      ? undefined
      : "No API key: pass --api-key, set PLANE_API_KEY or save one with `plane mcp config` " +
        "(or --url to use a running plane-mcp).",
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}
