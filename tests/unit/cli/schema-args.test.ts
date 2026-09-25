import { ParsedArgs } from "citty";
import {
  CliInputError,
  ToolInputSchema,
  argsFromSchema,
  commandName,
  kebab,
  toolArguments,
} from "../../../src/cli/schema-args";

const schema: ToolInputSchema = {
  properties: {
    slug: { type: "string", description: "Workspace slug." },
    workItem: { type: "string" },
    priority: { type: "string", enum: ["low", "high"] },
    per_page: { type: "integer" },
    fields: { type: "array" },
    args: { type: "object" },
    confirm: { type: "boolean" },
    cycle_id: { type: ["string", "null"] },
  },
  required: ["slug"],
};

function parsed(values: Record<string, string | boolean>): ParsedArgs {
  return { _: [], ...values } as ParsedArgs;
}

describe("CLI schema mapping", () => {
  it("names commands and flags in kebab-case", () => {
    expect(commandName("plane_list_work_items")).toBe("list-work-items");
    expect(commandName("plane_call")).toBe("call");
    expect(kebab("workItem")).toBe("work-item");
    expect(kebab("per_page")).toBe("per-page");
  });

  it("turns schema properties into citty flags", () => {
    const args = argsFromSchema(schema);
    expect(Object.keys(args)).toEqual([
      "slug",
      "work-item",
      "priority",
      "per-page",
      "fields",
      "args",
      "confirm",
      "cycle-id",
    ]);
    expect(args.slug).toEqual({ type: "string", description: "Workspace slug.", required: true });
    expect(args.priority).toEqual({ type: "string", valueHint: "low|high" });
    expect(args.confirm).toEqual({ type: "boolean" });
    expect(args["per-page"]).toMatchObject({ valueHint: "number" });
    expect(args.args).toMatchObject({ valueHint: "JSON" });
  });

  it("coerces flag values back to the tool's names and types", () => {
    expect(
      toolArguments(
        schema,
        parsed({
          slug: "acme",
          "work-item": "ENG-1",
          "per-page": "20",
          fields: "name, state_id",
          args: '{"slug":"acme"}',
          confirm: true,
          "cycle-id": "null",
        })
      )
    ).toEqual({
      slug: "acme",
      workItem: "ENG-1",
      per_page: 20,
      fields: ["name", "state_id"],
      args: { slug: "acme" },
      confirm: true,
      cycle_id: null,
    });
    expect(toolArguments(schema, parsed({ fields: '["a,b"]' }))).toEqual({ fields: ["a,b"] });
  });

  it("refuses values that do not fit the declared type", () => {
    expect(() => toolArguments(schema, parsed({ "per-page": "many" }))).toThrow(CliInputError);
    expect(() => toolArguments(schema, parsed({ "per-page": "many" }))).toThrow("--per-page expects a number");
    expect(() => toolArguments(schema, parsed({ args: "{nope" }))).toThrow("--args expects JSON");
  });
});
