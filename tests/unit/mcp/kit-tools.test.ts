import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import nock from "nock";
import { PlaneClient } from "../../../src/client/plane-client";
import { buildPlaneMcpServer } from "../../../src/mcp/build";
import { createPlaneMcpRuntime } from "../../../src/mcp/runtime";
import { ANA, ASSET, BASE, ISSUE, L_BUG, ME, P, S_DONE, V1, WS, issue, lookups } from "./v1-fixtures";

type ToolResult = Awaited<ReturnType<Client["callTool"]>>;

let client: Client;
let dir: string;

beforeEach(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "plane-kit-"));
  const plane = new PlaneClient({ baseUrl: BASE, apiKey: "secret" });
  const runtime = createPlaneMcpRuntime(plane, { sleep: async () => undefined });
  const server = buildPlaneMcpServer(plane, { workspace: WS, runtime });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(clientSide);
});

afterEach(async () => {
  await client.close();
  nock.cleanAll();
  fs.rmSync(dir, { recursive: true, force: true });
});

const text = (result: ToolResult): string =>
  (result.content as { type: string; text: string }[]).map((part) => part.text).join("");
const call = (name: string, args: Record<string, unknown> = {}) => client.callTool({ name, arguments: args });
async function json(name: string, args: Record<string, unknown> = {}): Promise<any> {
  const result = await call(name, args);
  if (result.isError) throw new Error(text(result));
  return JSON.parse(text(result));
}

const byKey = (overrides: Record<string, unknown> = {}) =>
  nock(BASE).get(`${V1}/work-items/ACME-14/`).reply(200, issue(overrides));

describe("kit tools", () => {
  it("plane_get_issue answers the readable task", async () => {
    lookups();
    byKey();
    const got = await json("plane_get_issue", { key: "acme-14" });
    expect(got).toMatchObject({
      key: "ACME-14",
      state: "Todo",
      state_group: "unstarted",
      assignees: ["alan"],
      labels: ["bug"],
      description: "See attachment",
    });
  });

  it("explains an invalid key", async () => {
    const result = await call("plane_get_issue", { key: "POINT14" });
    expect(result.isError).toBe(true);
    expect(text(result)).toContain("Use the format PROJECT-NUMBER (e.g. ACME-130)");
  });

  it("plane_list_my_issues keeps my open tasks, most recent first", async () => {
    lookups();
    nock(BASE)
      .get(`${V1}/projects/${P}/work-items/`)
      .query(true)
      .reply(200, {
        results: [
          issue({ sequence_id: 1, updated_at: "2026-09-01T00:00:00Z" }),
          issue({ sequence_id: 2, updated_at: "2026-09-10T00:00:00Z" }),
          issue({ sequence_id: 3, state: S_DONE }),
          issue({ sequence_id: 4, assignees: [ANA] }),
        ],
      });
    const mine = await json("plane_list_my_issues", {});
    expect(mine.total).toBe(2);
    expect(mine.shown).toBe(2);
    expect(mine.issues.map((row: { key: string }) => row.key)).toEqual(["ACME-2", "ACME-1"]);
    expect(mine.issues[0].description).toBeUndefined();
  });

  it("plane_search_issues filters by text, assignee and state group", async () => {
    lookups();
    nock(BASE)
      .get(`${V1}/projects/${P}/work-items/`)
      .query(true)
      .reply(200, {
        results: [
          issue({ sequence_id: 1, name: "Login quebrado", assignees: [ANA] }),
          issue({ sequence_id: 2, name: "Login lento", assignees: [ME] }),
          issue({ sequence_id: 3, name: "Cadastro", assignees: [ANA] }),
          issue({ sequence_id: 4, name: "Login antigo", assignees: [ANA], state: S_DONE }),
        ],
      });
    const found = await json("plane_search_issues", {
      project: "ACME",
      query: "login",
      assignee: "ana@example.com",
      state_groups: ["unstarted"],
      limit: 5,
    });
    expect(found.issues.map((row: { key: string }) => row.key)).toEqual(["ACME-1"]);
  });

  it("plane_create_issue assigns the key's user by default, and nobody for []", async () => {
    lookups();
    const created = nock(BASE)
      .post(`${V1}/projects/${P}/work-items/`, {
        name: "New task",
        assignees: [ME],
        description_html: "<p>a &lt;b&gt;</p>",
        state: S_DONE,
        priority: "low",
        labels: [L_BUG],
        target_date: "2026-12-01",
      })
      .reply(201, issue({ name: "New task", sequence_id: 20 }))
      .post(`${V1}/projects/${P}/work-items/`, { name: "Unassigned", assignees: [] })
      .reply(201, issue({ name: "Unassigned", sequence_id: 21, assignees: [] }));
    const first = await json("plane_create_issue", {
      project: "acme",
      title: "New task",
      description: "a <b>",
      state: "done",
      priority: "low",
      labels: ["bug"],
      target_date: "2026-12-01",
    });
    expect(first.key).toBe("ACME-20");
    const second = await json("plane_create_issue", { project: "ACME", title: "Unassigned", assignees: [] });
    expect(second.assignees).toEqual([]);
    expect(created.isDone()).toBe(true);
  });

  it("plane_update_issue sends only what changed; null clears a date; lists are replaced", async () => {
    lookups();
    byKey();
    const patch = nock(BASE)
      .patch(`${V1}/projects/${P}/work-items/${ISSUE}/`, {
        state: S_DONE,
        assignees: [ANA],
        labels: [],
        target_date: null,
      })
      .reply(200, issue({ state: S_DONE, assignees: [ANA], labels: [], target_date: null }));
    const updated = await json("plane_update_issue", {
      key: "ACME-14",
      state: "Done",
      assignees: ["ana"],
      labels: [],
      target_date: null,
    });
    expect(updated).toMatchObject({ state: "Done", assignees: ["ana"], labels: [], target_date: null });
    expect(patch.isDone()).toBe(true);

    byKey();
    const nothing = await call("plane_update_issue", { key: "ACME-14" });
    expect(text(nothing)).toContain("Nothing to change");

    byKey();
    const bad = await call("plane_update_issue", { key: "ACME-14", state: "Doing" });
    expect(bad.isError).toBe(true);
    expect(text(bad)).toContain("Available: Todo [unstarted], Done [completed].");
  });

  it("plane_add_comment renders markdown with raw HTML escaped, or text as paragraphs", async () => {
    byKey();
    byKey();
    const bodies: string[] = [];
    nock(BASE)
      .post(`${V1}/projects/${P}/work-items/${ISSUE}/comments/`, (body: { comment_html: string }) => {
        bodies.push(body.comment_html);
        return true;
      })
      .twice()
      .reply(201, { id: "c1" });
    await json("plane_add_comment", {
      key: "ACME-14",
      text: "## Ok\n- [x] **done**\n<img src=x onerror=alert(1)>",
      format: "markdown",
    });
    await json("plane_add_comment", { key: "ACME-14", text: "one\n<b>two</b>" });
    expect(bodies[0]).toContain("<h2>Ok</h2>");
    expect(bodies[0]).toContain("<strong>done</strong>");
    expect(bodies[0]).not.toContain("<img");
    expect(bodies[1]).toBe("<p>one</p><p>&lt;b&gt;two&lt;/b&gt;</p>");
  });

  it("plane_list_comments answers author names, oldest first", async () => {
    lookups();
    byKey();
    nock(BASE)
      .get(`${V1}/projects/${P}/work-items/${ISSUE}/comments/`)
      .query(true)
      .reply(200, {
        results: [
          { id: "2", actor: ANA, created_at: "2026-09-02", comment_html: "<p>segundo</p>" },
          { id: "1", actor: { id: ME }, created_at: "2026-09-01", comment_stripped: "primeiro" },
        ],
      });
    expect(await json("plane_list_comments", { key: "ACME-14" })).toEqual([
      { author: "alan", created_at: "2026-09-01", text: "primeiro" },
      { author: "ana", created_at: "2026-09-02", text: "segundo" },
    ]);
  });

  it("plane_get_issue_images saves each image and reports the ones that fail", async () => {
    const OTHER = "99999999-9999-4999-8999-999999999999";
    byKey({
      description_html:
        `<image-component src="${ASSET}"></image-component><img src="https://cdn.example.com/x.png">` +
        `<image-component src="${OTHER}"></image-component>`,
    });
    nock(BASE)
      .get(`${V1}/projects/${P}/issues/${ISSUE}/issue-attachments/${ASSET}/`)
      .reply(302, "", { Location: "/signed/1" })
      .get("/signed/1")
      .reply(200, Buffer.from("ffd8ffe000", "hex"))
      .get(`${V1}/projects/${P}/issues/${ISSUE}/issue-attachments/${OTHER}/`)
      .reply(500, "boom");
    const got = await json("plane_get_issue_images", { key: "ACME-14", dir });
    expect(got.dir).toBe(dir);
    expect(got.images[0]).toMatchObject({ n: 1, file: path.join(dir, "image-1.jpg"), bytes: 5 });
    expect(got.images[1]).toMatchObject({ n: 2, src: "https://cdn.example.com/x.png" });
    expect(got.images[1].error).toContain("external src");
    expect(got.images[2]).toMatchObject({ n: 3 });
    expect(got.images[2].error).toContain("500");
    expect(fs.readdirSync(dir)).toEqual(["image-1.jpg"]);

    const relative = await call("plane_get_issue_images", { key: "ACME-14", dir: "imgs" });
    expect(text(relative)).toContain('dir must be an absolute path: "imgs"');
  });

  it("lists states, labels, members and projects by name", async () => {
    lookups();
    expect(await json("plane_list_states", { project: "ACME" })).toEqual([
      { name: "Todo", group: "unstarted", default: true },
      { name: "Done", group: "completed", default: false },
    ]);
    expect(await json("plane_list_labels", { project: "ACME" })).toEqual(["bug"]);
    expect(await json("plane_list_members", { project: "ACME" })).toEqual([
      { display_name: "alan", email: "alan@example.com" },
      { display_name: "ana", email: "ana@example.com" },
    ]);
    expect(await json("plane_list_projects")).toEqual([{ identifier: "ACME", name: "Acme", id: P }]);
  });

  it("plane_whoami names the workspace and the API version", async () => {
    nock(BASE).get("/api/v1/users/me/").reply(200, { id: ME, display_name: "alan", email: "alan@example.com" });
    nock(BASE).get("/api/v2/users/me/").reply(404, {});
    expect(await json("plane_whoami")).toEqual({
      id: ME,
      display_name: "alan",
      email: "alan@example.com",
      workspace: WS,
      base_url: BASE,
      api: "v1",
    });
  });

  it("offers no tool that deletes", async () => {
    const { tools } = await client.listTools();
    const typed = tools.filter((tool) => tool.name !== "plane_call");
    expect(typed.filter((tool) => tool.annotations?.destructiveHint)).toEqual([]);
    expect(typed.map((tool) => tool.name).filter((name) => /delete|remove/.test(name))).toEqual([]);
  });
});
