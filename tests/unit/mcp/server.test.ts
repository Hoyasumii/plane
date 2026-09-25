import { createServer, request } from "node:http";
import { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import nock from "nock";
import { RunningPlaneMcpServer, startPlaneMcpServer } from "../../../src/mcp";
import { hostAllowed } from "../../../src/mcp/server";

const BASE = "https://api.example.com";

let running: RunningPlaneMcpServer | undefined;
afterEach(async () => {
  nock.cleanAll();
  await running?.close();
  running = undefined;
});

async function connect(url: string): Promise<Client> {
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(url)));
  return client;
}

function text(result: Awaited<ReturnType<Client["callTool"]>>): string {
  return (result.content as { type: string; text: string }[]).map((part) => part.text).join("");
}

describe("startPlaneMcpServer", () => {
  it("serves the tools over Streamable HTTP and calls Plane with the given key", async () => {
    running = await startPlaneMcpServer({ port: 0, baseUrl: BASE, apiKey: "secret" });
    expect(running.url).toBe(`http://127.0.0.1:${running.port}/mcp`);

    const scope = nock(BASE, { reqheaders: { "x-api-key": "secret" } })
      .get("/api/v1/users/me/")
      .reply(200, { id: "u1", display_name: "Ada" })
      .get("/api/v2/users/me/")
      .reply(200, { id: "u1" });

    const client = await connect(running.url);
    const { tools } = await client.listTools();
    const names = tools.map((tool) => tool.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "plane_whoami",
        "plane_get_issue",
        "plane_update_issue",
        "plane_add_comment",
        "plane_get_issue_images",
        "plane_list_work_items",
        "plane_resources",
        "plane_describe",
        "plane_call",
      ])
    );

    const result = await client.callTool({ name: "plane_whoami", arguments: {} });
    expect(result.isError).toBeFalsy();
    expect(text(result)).toContain('"display_name": "Ada"');
    expect(text(result)).toContain('"api": "v2"');
    expect(scope.isDone()).toBe(true);
    await client.close();
  });

  it("resolves a task key before commenting", async () => {
    running = await startPlaneMcpServer({ port: 0, baseUrl: BASE, apiKey: "secret" });
    nock(BASE).get("/api/v1/workspaces/acme/work-items/ENG-7/").reply(200, { id: "wi-7", project: "p1" });
    const post = nock(BASE)
      .post("/api/v1/workspaces/acme/projects/p1/work-items/wi-7/comments/", { comment_html: "<p>hi</p>" })
      .reply(201, { id: "c1", comment_html: "<p>hi</p>" });

    const client = await connect(running.url);
    const result = await client.callTool({
      name: "plane_add_comment",
      arguments: { slug: "acme", key: "eng-7", text: "hi" },
    });
    expect(result.isError).toBeFalsy();
    expect(JSON.parse(text(result))).toEqual({ created: true, key: "ENG-7", comment_id: "c1" });
    expect(post.isDone()).toBe(true);
    await client.close();
  });

  it("reports API errors as tool errors, with what to check", async () => {
    running = await startPlaneMcpServer({ port: 0, baseUrl: BASE, apiKey: "secret" });
    nock(BASE).get("/api/v1/workspaces/acme/projects/").query(true).reply(403, { detail: "Nope." });

    const client = await connect(running.url);
    const result = await client.callTool({ name: "plane_list_projects", arguments: { slug: "acme" } });
    expect(result.isError).toBe(true);
    expect(text(result)).toContain("Plane answered 403");
    expect(text(result)).toContain("check PLANE_API_KEY");
    await client.close();
  });

  it("rejects bad arguments and a port already in use", async () => {
    await expect(startPlaneMcpServer({ port: 70000, baseUrl: BASE, apiKey: "k" })).rejects.toThrow("port must be");
    await expect(startPlaneMcpServer({ port: 0, baseUrl: "", apiKey: "k" })).rejects.toThrow("baseUrl is required");
    await expect(startPlaneMcpServer({ port: 0, baseUrl: "not a url", apiKey: "k" })).rejects.toThrow(
      "not a valid URL"
    );
    await expect(startPlaneMcpServer({ port: 0, baseUrl: BASE, apiKey: "" })).rejects.toThrow("apiKey is required");

    const blocker = createServer();
    await new Promise<void>((resolve) => blocker.listen(0, "127.0.0.1", resolve));
    const { port } = blocker.address() as AddressInfo;
    await expect(startPlaneMcpServer({ port, baseUrl: BASE, apiKey: "k" })).rejects.toThrow(/EADDRINUSE/);
    await new Promise<void>((resolve) => blocker.close(() => resolve()));
  });

  it("falls back to the default workspace when slug is omitted", async () => {
    running = await startPlaneMcpServer({ port: 0, baseUrl: BASE, apiKey: "secret", workspace: "acme" });
    const probe = nock(BASE).get("/api/v2/users/me/").reply(200, { id: "u1" });
    const projects = nock(BASE).get("/api/v1/workspaces/acme/projects/").query(true).reply(200, { results: [] });
    const states = nock(BASE)
      .get("/api/v2/workspaces/acme/projects/p1/states/")
      .reply(200, { data: [], pagination: {} });
    const other = nock(BASE).get("/api/v1/workspaces/other/projects/").query(true).reply(200, { results: [] });

    const client = await connect(running.url);
    const listProjects = (await client.listTools()).tools.find((tool) => tool.name === "plane_list_projects");
    expect(listProjects?.inputSchema.required ?? []).not.toContain("slug");

    expect((await client.callTool({ name: "plane_list_projects", arguments: {} })).isError).toBeFalsy();
    expect(
      (
        await client.callTool({
          name: "plane_call",
          arguments: { resource: "workspaces.projects.states", method: "list", args: { project: "p1" } },
        })
      ).isError
    ).toBeFalsy();
    expect((await client.callTool({ name: "plane_list_projects", arguments: { slug: "other" } })).isError).toBeFalsy();
    expect([probe.isDone(), projects.isDone(), states.isDone(), other.isDone()]).toEqual([true, true, true, true]);
    await client.close();
  });

  it("asks for slug without a default workspace", async () => {
    running = await startPlaneMcpServer({ port: 0, baseUrl: BASE, apiKey: "secret" });
    nock(BASE).get("/api/v2/users/me/").reply(200, { id: "u1" });
    const client = await connect(running.url);
    const listWorkItems = (await client.listTools()).tools.find((tool) => tool.name === "plane_list_work_items");
    expect(listWorkItems?.inputSchema.required).toContain("slug");

    const issue = await client.callTool({ name: "plane_get_issue", arguments: { key: "ENG-1" } });
    expect(issue.isError).toBe(true);
    expect(text(issue)).toContain("slug is required");

    const result = await client.callTool({
      name: "plane_call",
      arguments: { resource: "workspaces.projects", method: "list", args: {} },
    });
    expect(result.isError).toBe(true);
    expect(text(result)).toContain("needs 'slug'");
    await client.close();
  });

  it("refuses a Host other than loopback (DNS rebinding)", async () => {
    running = await startPlaneMcpServer({ port: 0, baseUrl: BASE, apiKey: "secret" });
    const status = await new Promise<number>((resolve, reject) => {
      const req = request(
        { host: "127.0.0.1", port: running!.port, path: "/mcp", method: "POST", headers: { host: "evil.example" } },
        (res) => {
          res.resume();
          resolve(res.statusCode ?? 0);
        }
      );
      req.on("error", reject);
      req.end("{}");
    });
    expect(status).toBe(403);
    expect(hostAllowed("localhost:3766")).toBe(true);
    expect(hostAllowed("127.0.0.1")).toBe(true);
    expect(hostAllowed("[::1]:3766")).toBe(true);
    expect(hostAllowed("127.0.0.1.evil.example")).toBe(false);
    expect(hostAllowed(undefined)).toBe(false);
  });

  it("answers GET /health with the workspace and the API version", async () => {
    running = await startPlaneMcpServer({ port: 0, baseUrl: BASE, apiKey: "secret", workspace: "acme" });
    nock(BASE).get("/api/v2/users/me/").reply(404, { detail: "Not found." });
    const response = await fetch(running.url.replace("/mcp", "/health"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, workspace: "acme", api: "v1" });
  });

  it("answers 404 off the endpoint and 405 for GET", async () => {
    running = await startPlaneMcpServer({ port: 0, baseUrl: BASE, apiKey: "secret" });
    expect((await fetch(running.url.replace("/mcp", "/other"))).status).toBe(404);
    expect((await fetch(running.url)).status).toBe(405);
  });
});

describe("POST /shutdown", () => {
  async function post(url: string, token?: string): Promise<number> {
    const response = await fetch(new URL("/shutdown", url), {
      method: "POST",
      headers: token === undefined ? {} : { "X-Plane-Shutdown": token },
    });
    return response.status;
  }

  it("answers 202 and calls onShutdown for the right token, 403 for any other", async () => {
    let shutdowns = 0;
    running = await startPlaneMcpServer({
      port: 0,
      baseUrl: BASE,
      apiKey: "k",
      shutdownToken: "s3cret",
      onShutdown: () => shutdowns++,
    });
    expect(await post(running.url)).toBe(403);
    expect(await post(running.url, "wrong")).toBe(403);
    expect(await post(running.url, "s3cret-and-more")).toBe(403);
    expect(shutdowns).toBe(0);
    expect(await post(running.url, "s3cret")).toBe(202);
    await new Promise((resolve) => setImmediate(resolve));
    expect(shutdowns).toBe(1);
  });

  it("closes the server itself when given a token and no onShutdown", async () => {
    running = await startPlaneMcpServer({ port: 0, baseUrl: BASE, apiKey: "k", shutdownToken: "s3cret" });
    expect(await post(running.url, "s3cret")).toBe(202);
    await new Promise((resolve) => setTimeout(resolve, 50));
    await expect(fetch(new URL("/health", running.url))).rejects.toThrow();
  });

  it("refuses every request when the server has no token", async () => {
    running = await startPlaneMcpServer({ port: 0, baseUrl: BASE, apiKey: "k" });
    expect(await post(running.url, "")).toBe(403);
    expect(await post(running.url, "anything")).toBe(403);
  });
});
