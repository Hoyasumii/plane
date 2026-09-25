import { buildCatalog } from "../../../scripts/build-mcp-catalog";
import { CATALOG, describeMethod, findMethod, searchCatalog } from "../../../src/mcp/catalog";
import { classMethods, operationsOf, instantiate, reachableResources, resourceEntries } from "../v2/tree-walk";

describe("MCP catalog", () => {
  it("matches what the source says today — run `pnpm codegen:mcp` when this fails", () => {
    expect(CATALOG).toEqual(buildCatalog());
  });

  it("covers every reachable v2 resource, by its attribute path", () => {
    const expected = [...reachableResources().values()].map((dotted) => dotted.replace(/^v2\./, "")).sort();
    expect(CATALOG.resources.map((entry) => entry.resource).sort()).toEqual(expected);
    expect(expected.length).toBeGreaterThanOrEqual(90);
  });

  it("lists every public method and every `operations` key of every resource", () => {
    const paths = reachableResources();
    for (const entry of resourceEntries()) {
      const dotted = paths.get(entry.cls)!.replace(/^v2\./, "");
      const listed = new Set(CATALOG.resources.find((r) => r.resource === dotted)!.methods.map((m) => m.name));
      for (const name of classMethods(entry).keys()) expect([dotted, listed.has(name)]).toEqual([dotted, true]);
      for (const action of Object.keys(operationsOf(instantiate(entry)))) {
        expect([dotted, action, listed.has(action)]).toEqual([dotted, action, true]);
      }
    }
  });

  it("marks deletes and bridge removals destructive, and lookups read-only", () => {
    expect(findMethod("workspaces.projects.states", "delete").method.kind).toBe("destructive");
    expect(findMethod("workspaces.projects.cycles.workItems", "remove").method.kind).toBe("destructive");
    expect(findMethod("workspaces.projects.states", "findByName").method.kind).toBe("read");
    expect(findMethod("workspaces.projects.states", "create").method.kind).toBe("write");
  });

  it("records parameters in call order, path ids first", () => {
    const { method } = findMethod("workspaces.projects.workItems", "update");
    expect(method.params.map((p) => p.name)).toEqual(["slug", "project", "workItem", "data", "params"]);
    expect(method.pathIds).toEqual(["slug", "project"]);
    expect(method.params[3].properties?.map((p) => p.name)).toContain("state_id");
  });

  it("searches and describes", () => {
    expect(searchCatalog()).toContain("workspaces.projects.states:");
    expect(searchCatalog("cycle work items")).toContain("workspaces.projects.cycles.workItems");
    const text = describeMethod("workspaces.projects.states", "list");
    expect(text).toContain("Allowed order_by:");
    expect(text).toContain('"resource":"workspaces.projects.states"');
    expect(() => describeMethod("workspaces.nope", "list")).toThrow("Unknown resource");
    expect(() => describeMethod("workspaces.projects.states", "nope")).toThrow("has no method 'nope'");
  });
});
