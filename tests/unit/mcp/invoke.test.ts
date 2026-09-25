import nock from "nock";
import { PlaneClient } from "../../../src/client/plane-client";
import { MissingPathIdError } from "../../../src/errors/MissingPathIdError";
import { PlaneApiError } from "../../../src/errors/PlaneApiError";
import { describeError } from "../../../src/mcp/errors";
import { invoke, toResultText, MAX_RESULT_CHARS } from "../../../src/mcp/invoke";

const BASE = "https://api.example.com";
const STATES = "/api/v2/workspaces/acme/projects/ENG/states/";
const client = () => new PlaneClient({ baseUrl: BASE, apiKey: "secret" });

afterEach(() => nock.cleanAll());

describe("invoke", () => {
  it("orders named args into the SDK's positional parameters and runs the SDK's own validation", async () => {
    const scope = nock(BASE)
      .get(STATES)
      .query({ order_by: "sequence", per_page: "5" })
      .reply(200, { data: [{ id: "s1", name: "Todo" }], pagination: { style: "offset" } });

    const page = await invoke(client(), "workspaces.projects.states", "list", {
      args: { params: { per_page: 5, order_by: "sequence" }, project: "ENG", slug: "acme" },
    });

    expect(scope.isDone()).toBe(true);
    expect(toResultText(page)).toContain('"name": "Todo"');
    await expect(
      invoke(client(), "workspaces.projects.states", "list", {
        args: { slug: "acme", project: "ENG", params: { order_by: "bogus" } },
      })
    ).rejects.toThrow("Unknown order_by 'bogus'");
  });

  it("refuses unknown and missing arguments before any request", async () => {
    await expect(
      invoke(client(), "workspaces.projects.states", "list", { args: { slug: "acme", projet: "ENG" } })
    ).rejects.toThrow("Unknown argument(s) for workspaces.projects.states.list: projet");
    await expect(invoke(client(), "workspaces.projects.states", "list", { args: { slug: "acme" } })).rejects.toThrow(
      "needs 'project'"
    );
  });

  it("gates destructive methods behind confirm", async () => {
    const args = { slug: "acme", project: "ENG", state: "s1" };
    await expect(invoke(client(), "workspaces.projects.states", "delete", { args })).rejects.toThrow("confirm: true");

    const scope = nock(BASE).delete(`${STATES}s1/`).reply(204);
    await expect(invoke(client(), "workspaces.projects.states", "delete", { args, confirm: true })).resolves.toEqual({
      ok: true,
    });
    expect(scope.isDone()).toBe(true);
  });

  it("collects an iterate method up to the limit", async () => {
    nock(BASE)
      .get(STATES)
      .query(true)
      .reply(200, {
        data: [{ id: "a" }, { id: "b" }, { id: "c" }],
        pagination: { style: "offset", has_next: true, next_offset: 3 },
      });

    const result = await invoke(client(), "workspaces.projects.states", "iterate", {
      args: { slug: "acme", project: "ENG" },
      limit: 2,
    });

    expect(result).toEqual({ items: [{ id: "a" }, { id: "b" }], count: 2, truncated: true });
  });

  it("truncates oversized results with a hint", () => {
    const text = toResultText({ blob: "x".repeat(MAX_RESULT_CHARS + 10) });
    expect(text.length).toBeLessThan(MAX_RESULT_CHARS + 200);
    expect(text).toContain("[truncated:");
  });
});

describe("describeError", () => {
  it("renders API problems with their field errors", () => {
    const error = new PlaneApiError({
      type: "validation_error",
      title: "Invalid input",
      status: 400,
      code: "invalid",
      detail: "Name is required.",
      errors: [{ field: "name", message: "This field is required." }],
    });
    expect(describeError(error)).toBe(
      "Plane API error 400 invalid: Name is required.\nTitle: Invalid input\n- name: This field is required."
    );
  });

  it("names the missing path id", () => {
    const error = new MissingPathIdError(
      "States",
      "list",
      "/workspaces/{slug}/projects/{project_id}/states/",
      "project_id",
      ["slug"]
    );
    expect(describeError(error)).toContain("(missing: project_id)");
  });
});
