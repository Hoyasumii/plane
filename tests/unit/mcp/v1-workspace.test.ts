import nock from "nock";
import { PlaneClient } from "../../../src/client/plane-client";
import { MAX_IMAGE_BYTES, PlaneV1Workspace } from "../../../src/mcp/v1/workspace";
import { ANA, ASSET, BASE, ISSUE, L_BUG, ME, P, S_DONE, V1, WS, issue, lookups } from "./v1-fixtures";

const PNG = Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), Buffer.alloc(16)]);

function workspace(extra: { now?: () => number } = {}) {
  const sleeps: number[] = [];
  const v1 = new PlaneV1Workspace(new PlaneClient({ baseUrl: BASE, apiKey: "secret" }), {
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    ...extra,
  });
  return { v1, sleeps };
}

afterEach(() => nock.cleanAll());

describe("PlaneV1Workspace", () => {
  describe("resolution by name", () => {
    it("finds projects, states, labels and members by any readable reference", async () => {
      lookups();
      const { v1 } = workspace();
      expect((await v1.resolveProject(WS, "acme")).id).toBe(P);
      expect((await v1.resolveProject(WS, "Acme")).id).toBe(P);
      expect((await v1.resolveProject(WS, P)).identifier).toBe("ACME");
      expect((await v1.resolveState(WS, P, "done")).id).toBe(S_DONE);
      expect(await v1.resolveLabels(WS, P, ["BUG", L_BUG])).toEqual([L_BUG, L_BUG]);
      expect(await v1.resolveMembers(WS, P, ["me", "ME", "ana@example.com", "ana", "Ana Lima", ANA])).toEqual([
        ME,
        ME,
        ANA,
        ANA,
        ANA,
        ANA,
      ]);
      expect(await v1.resolveMembers(WS, P, [])).toEqual([]);
    });

    it("lists the valid options when a reference does not match", async () => {
      lookups();
      const { v1 } = workspace();
      await expect(v1.resolveProject(WS, "NOPE")).rejects.toThrow('Project "NOPE" not found. Available: ACME (Acme).');
      await expect(v1.resolveState(WS, P, "Doing")).rejects.toThrow(
        'State "Doing" does not exist in this project. Available: Todo [unstarted], Done [completed].'
      );
      await expect(v1.resolveLabels(WS, P, ["feature"])).rejects.toThrow("Available: bug.");
      await expect(v1.resolveMembers(WS, P, ["bob"])).rejects.toThrow(
        'Member "bob" not found in the project. Available: alan, ana.'
      );
    });
  });

  it("describes a work item with names and no ids", async () => {
    lookups();
    const { v1 } = workspace();
    const described = await v1.describeIssue(WS, issue({ assignees: [ME, ANA] }));
    expect(described).toEqual({
      key: "ACME-14",
      title: "Login screen",
      project: "Acme",
      state: "Todo",
      state_group: "unstarted",
      priority: "high",
      assignees: ["alan", "ana"],
      labels: ["bug"],
      start_date: null,
      target_date: "2026-10-01",
      created_at: "2026-09-01T10:00:00Z",
      updated_at: "2026-09-20T10:00:00Z",
      url: `${BASE}/${WS}/projects/${P}/issues/${ISSUE}`,
      description: "See attachment",
    });
    const withImage = await v1.describeIssue(
      WS,
      issue({ description_html: `<p>See</p><image-component src="${ASSET}">`, description_stripped: "See" })
    );
    expect(withImage.description).toBe("See\n\n[image 1]");
    expect(withImage.images).toEqual([{ n: 1, asset_id: ASSET }]);
    // Only the link to the task carries ids.
    const summary = await v1.summarize(WS, [issue()], 10);
    expect(JSON.stringify(summary.issues.map(({ url: _url, ...rest }) => rest))).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-/
    );
  });

  it("caches lookups for five minutes, then loads again", async () => {
    let clock = 0;
    const scope = nock(BASE)
      .get(`${V1}/projects/`)
      .query(true)
      .twice()
      .reply(200, { results: [{ id: P, identifier: "ACME", name: "Acme" }] });
    const { v1 } = workspace({ now: () => clock });
    await v1.projects(WS);
    await v1.projects(WS);
    expect(scope.pendingMocks()).toHaveLength(1);
    clock = 5 * 60 * 1000 + 1;
    await v1.projects(WS);
    expect(scope.isDone()).toBe(true);
  });

  it("follows the cursor across pages", async () => {
    nock(BASE)
      .get(`${V1}/projects/${P}/work-items/`)
      .query({ per_page: "100" })
      .reply(200, { results: [issue()], next_page_results: true, next_cursor: "100:1:0" })
      .get(`${V1}/projects/${P}/work-items/`)
      .query({ per_page: "100", cursor: "100:1:0" })
      .reply(200, { results: [issue({ id: "second" })], next_page_results: false, next_cursor: "100:2:0" });
    const { v1 } = workspace();
    expect((await v1.listProjectIssues(WS, P)).map((row) => row.id)).toEqual([ISSUE, "second"]);
  });

  describe("rate limit", () => {
    it("waits the Retry-After of a 429 once, capped at 60 s, and tries again", async () => {
      nock(BASE)
        .get("/api/v1/users/me/")
        .reply(429, { detail: "slow down" }, { "Retry-After": "120" })
        .get("/api/v1/users/me/")
        .reply(200, { id: ME });
      const { v1, sleeps } = workspace();
      expect((await v1.me()).id).toBe(ME);
      expect(sleeps).toEqual([60_000]);
    });

    it("gives up on a second 429 and does not cache the failure", async () => {
      nock(BASE)
        .get("/api/v1/users/me/")
        .twice()
        .reply(429, {}, { "Retry-After": "2" })
        .get("/api/v1/users/me/")
        .reply(200, { id: ME });
      const { v1, sleeps } = workspace();
      await expect(v1.me()).rejects.toMatchObject({ statusCode: 429 });
      expect(sleeps).toEqual([2000]);
      expect((await v1.me()).id).toBe(ME);
    });
  });

  describe("images", () => {
    const detail = `${V1}/projects/${P}/issues/${ISSUE}/issue-attachments/${ASSET}/`;

    it("follows the attachment redirect to the signed URL without the API key", async () => {
      nock(BASE, { reqheaders: { "x-api-key": "secret" } })
        .get(detail)
        .reply(302, "", { Location: "https://storage.example.com/signed?sig=1" });
      const storage = nock("https://storage.example.com", { badheaders: ["x-api-key"] })
        .get("/signed")
        .query({ sig: "1" })
        .reply(200, PNG, { "Content-Type": "application/octet-stream" });
      const { v1 } = workspace();
      const image = await v1.downloadIssueImage(WS, P, ISSUE, ASSET);
      expect(image.ext).toBe("png");
      expect(image.buffer.equals(PNG)).toBe(true);
      expect(storage.isDone()).toBe(true);
    });

    it("waits out one 429 on the attachment detail", async () => {
      nock(BASE)
        .get(detail)
        .reply(429, "", { "Retry-After": "3" })
        .get(detail)
        .reply(302, "", { Location: "/storage/x" })
        .get("/storage/x")
        .reply(200, Buffer.from("GIF89a"));
      const { v1, sleeps } = workspace();
      expect((await v1.downloadIssueImage(WS, P, ISSUE, ASSET)).ext).toBe("gif");
      expect(sleeps).toEqual([3000]);
    });

    it("refuses what is not an image, what is too large and an answer that is not a redirect", async () => {
      const { v1 } = workspace();
      nock(BASE).get(detail).reply(302, "", { Location: "/s/pdf" }).get("/s/pdf").reply(200, Buffer.from("%PDF-1.7"), {
        "Content-Type": "application/pdf",
      });
      await expect(v1.downloadIssueImage(WS, P, ISSUE, ASSET)).rejects.toThrow("is not an image (application/pdf)");

      nock(BASE)
        .get(detail)
        .reply(302, "", { Location: "/s/big" })
        .get("/s/big")
        .reply(200, PNG, { "Content-Length": String(MAX_IMAGE_BYTES + 1) });
      await expect(v1.downloadIssueImage(WS, P, ISSUE, ASSET)).rejects.toThrow("larger than 20 MB");

      nock(BASE).get(detail).reply(404, { detail: "Not found." });
      await expect(v1.downloadIssueImage(WS, P, ISSUE, ASSET)).rejects.toMatchObject({ statusCode: 404 });

      await expect(v1.downloadIssueImage(WS, P, ISSUE, "../etc")).rejects.toThrow('Invalid asset id: "../etc".');
    });
  });

  it("explains a task that does not exist", async () => {
    nock(BASE).get(`${V1}/work-items/ACME-999/`).reply(404, { detail: "Not found." });
    const { v1 } = workspace();
    await expect(v1.getIssueByKey(WS, "acme-999")).rejects.toThrow("Task ACME-999 not found in workspace 'acme'.");
  });
});
