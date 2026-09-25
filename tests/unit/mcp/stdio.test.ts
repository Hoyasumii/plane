import { PassThrough, Readable, Writable } from "node:stream";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { ReadBuffer, serializeMessage } from "@modelcontextprotocol/sdk/shared/stdio.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import nock from "nock";
import { RunningPlaneMcpStdio, servePlaneMcpStdio } from "../../../src/mcp";
import { parsePlaneMcpArgs } from "../../../src/mcp/cli";

const BASE = "https://api.example.com";

/** The client end of a stdio pipe: newline-delimited JSON-RPC over a pair of streams. */
class StreamClientTransport implements Transport {
  onmessage?: (message: JSONRPCMessage) => void;
  onclose?: () => void;
  onerror?: (error: Error) => void;
  private readonly buffer = new ReadBuffer();

  constructor(
    private readonly input: Readable,
    private readonly output: Writable
  ) {}

  async start(): Promise<void> {
    this.input.on("data", (chunk: Buffer) => {
      this.buffer.append(chunk);
      for (let message = this.buffer.readMessage(); message; message = this.buffer.readMessage()) {
        this.onmessage?.(message);
      }
    });
  }

  async send(message: JSONRPCMessage): Promise<void> {
    this.output.write(serializeMessage(message));
  }

  async close(): Promise<void> {
    this.onclose?.();
  }
}

let running: RunningPlaneMcpStdio | undefined;
afterEach(async () => {
  nock.cleanAll();
  await running?.close();
  running = undefined;
});

async function serve(workspace?: string): Promise<{ client: Client; stdin: PassThrough }> {
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  running = await servePlaneMcpStdio({ baseUrl: BASE, apiKey: "secret", workspace, stdin, stdout });
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(new StreamClientTransport(stdout, stdin));
  return { client, stdin };
}

function text(result: Awaited<ReturnType<Client["callTool"]>>): string {
  return (result.content as { type: string; text: string }[]).map((part) => part.text).join("");
}

describe("servePlaneMcpStdio", () => {
  it("serves the tools over stdin/stdout and calls Plane with the given key", async () => {
    const scope = nock(BASE, { reqheaders: { "x-api-key": "secret" } })
      .get("/api/v1/users/me/")
      .reply(200, { id: "u1", display_name: "Ada" })
      .get("/api/v2/users/me/")
      .reply(200, { id: "u1" });

    const { client } = await serve("acme");
    const names = (await client.listTools()).tools.map((tool) => tool.name);
    expect(names).toEqual(expect.arrayContaining(["plane_whoami", "plane_get_issue", "plane_call"]));
    expect(client.getInstructions()).toContain("The default workspace is 'acme'");

    const result = await client.callTool({ name: "plane_whoami", arguments: {} });
    expect(result.isError).toBeFalsy();
    expect(text(result)).toContain('"display_name": "Ada"');
    expect(scope.isDone()).toBe(true);
  });

  it("settles `closed` when the client closes stdin", async () => {
    const { stdin } = await serve();
    stdin.end();
    await expect(running?.closed).resolves.toBeUndefined();
  });

  it("rejects a missing key or a bad base URL before touching the streams", async () => {
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    await expect(servePlaneMcpStdio({ baseUrl: BASE, apiKey: " ", stdin, stdout })).rejects.toThrow(
      "apiKey is required."
    );
    await expect(servePlaneMcpStdio({ baseUrl: "nope", apiKey: "k", stdin, stdout })).rejects.toThrow(
      "baseUrl is not a valid URL"
    );
    expect(stdin.listenerCount("data")).toBe(0);
  });
});

describe("parsePlaneMcpArgs", () => {
  it("defaults to stdio and takes --http, --stdio and --help", () => {
    expect(parsePlaneMcpArgs([])).toEqual({ mode: "stdio" });
    expect(parsePlaneMcpArgs(["--stdio"])).toEqual({ mode: "stdio" });
    expect(parsePlaneMcpArgs(["--http"])).toEqual({ mode: "http" });
    expect(parsePlaneMcpArgs(["-h"])).toEqual({ mode: "help" });
    expect(parsePlaneMcpArgs(["--http", "--help"])).toEqual({ mode: "help" });
  });

  it("refuses an unknown argument and both transports at once", () => {
    expect(() => parsePlaneMcpArgs(["--port"])).toThrow("Unknown argument '--port'");
    expect(() => parsePlaneMcpArgs(["--http", "--stdio"])).toThrow("either --stdio or --http");
  });
});
