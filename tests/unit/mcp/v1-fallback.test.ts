import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import nock from "nock";
import { PlaneClient } from "../../../src/client/plane-client";
import { buildPlaneMcpServer } from "../../../src/mcp/build";
import { createPlaneMcpRuntime } from "../../../src/mcp/runtime";
import { ANA, BASE, ISSUE, L_BUG, P, S_DONE, V1, WS, issue, lookups } from "./v1-fixtures";

type ToolResult = Awaited<ReturnType<Client["callTool"]>>;

let client: Client;

beforeEach(async () => {
  const plane = new PlaneClient({ baseUrl: BASE, apiKey: "secret" });
  const server = buildPlaneMcpServer(plane, { workspace: WS, runtime: createPlaneMcpRuntime(plane) });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(clientSide);
});

afterEach(async () => {
  await client.close();
  nock.cleanAll();
});

const text = (result: ToolResult): string =>
  (result.content as { type: string; text: string }[]).map((part) => part.text).join("");
const call = (name: string, args: Record<string, unknown> = {}) => client.callTool({ name, arguments: args });
const noV2 = () => nock(BASE).get("/api/v2/users/me/").reply(404, { detail: "Not found." });

describe("instance without API v2", () => {
  it("probes once and answers the work item tools through v1", async () => {
    const probe = noV2();
    lookups();
    nock(BASE)
      .get(`${V1}/projects/${P}/work-items/`)
      .query(true)
      .reply(200, { results: [issue(), issue({ id: "other", sequence_id: 15, priority: "low" })] })
      .get(`${V1}/work-items/ACME-14/`)
      .reply(200, issue());

    const listed = await call("plane_list_work_items", { project: "ACME", priority: "high", per_page: 10 });
    expect(listed.isError).toBeFalsy();
    const page = JSON.parse(text(listed));
    expect(page).toMatchObject({ api: "v1", total: 1, count: 1 });
    expect(page.items[0]).toMatchObject({ id: ISSUE, key: "ACME-14", state: "Todo" });

    const got = await call("plane_get_work_item", { workItem: "ACME-14" });
    expect(JSON.parse(text(got))).toMatchObject({ id: ISSUE, sequence_id: 14 });
    expect(probe.isDone()).toBe(true);
  });

  it("creates and updates with readable values, and refuses what only v2 can do", async () => {
    noV2();
    lookups();
    const writes = nock(BASE)
      .post(`${V1}/projects/${P}/work-items/`, { name: "New task", state: S_DONE, assignees: [ANA], labels: [L_BUG] })
      .reply(201, issue({ name: "New task" }))
      .get(`${V1}/work-items/ACME-14/`)
      .reply(200, issue())
      .patch(`${V1}/projects/${P}/work-items/${ISSUE}/`, { priority: "urgent" })
      .reply(200, issue({ priority: "urgent" }));

    const created = await call("plane_create_work_item", {
      project: "ACME",
      name: "New task",
      state: "Done",
      assignees: ["ana@example.com"],
      labels: ["bug"],
    });
    expect(created.isError).toBeFalsy();
    const updated = await call("plane_update_work_item", { workItem: "ACME-14", priority: "urgent" });
    expect(updated.isError).toBeFalsy();
    expect(writes.isDone()).toBe(true);

    const refused = await call("plane_update_work_item", { workItem: "ACME-14", cycle_id: "c1" });
    expect(refused.isError).toBe(true);
    expect(text(refused)).toContain("cycle_id requires Plane API v2, which this instance does not serve");
    const expand = await call("plane_get_work_item", { workItem: "ACME-14", expand: ["state"] });
    expect(text(expand)).toContain("expand requires Plane API v2");
  });

  it("says plainly that plane_resources and plane_call cannot work, while plane_describe still does", async () => {
    noV2();
    for (const [name, args] of [
      ["plane_resources", {}],
      ["plane_call", { resource: "workspaces.projects", method: "list", args: {} }],
    ] as const) {
      const result = await call(name, args);
      expect(result.isError).toBe(true);
      expect(text(result)).toContain("does not serve API v2");
      expect(text(result)).not.toContain("404 not_found");
    }
    const described = await call("plane_describe", { resource: "workspaces.projects", method: "list" });
    expect(described.isError).toBeFalsy();
  });

  it("does not cache a probe that failed on the key", async () => {
    nock(BASE).get("/api/v2/users/me/").reply(401, { detail: "bad key" }).get("/api/v2/users/me/").reply(404, {});
    const first = await call("plane_resources");
    expect(text(first)).toContain("Plane answered 401: check PLANE_API_KEY");
    const second = await call("plane_resources");
    expect(text(second)).toContain("does not serve API v2");
  });

  it("keeps using v2 where it exists", async () => {
    nock(BASE)
      .get("/api/v2/users/me/")
      .reply(200, { id: "u1" })
      .get(`/api/v2/workspaces/${WS}/work-items/`)
      .query(true)
      .reply(200, { data: [{ id: "w1" }], pagination: { style: "offset" } });
    const listed = await call("plane_list_work_items", {});
    expect(listed.isError).toBeFalsy();
    expect(text(listed)).toContain('"w1"');
  });
});
