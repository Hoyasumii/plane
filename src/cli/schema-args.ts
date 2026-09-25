import type { ArgDef, ArgsDef, ParsedArgs } from "citty";

/** The slice of a tool's JSON Schema `inputSchema` the CLI reads. */
export interface ToolInputSchema {
  properties?: Record<string, ToolInputProperty>;
  required?: string[];
}

export interface ToolInputProperty {
  type?: string | string[];
  description?: string;
  enum?: unknown[];
}

/** Thrown for a flag value that cannot become the type the tool declares. */
export class CliInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliInputError";
  }
}

/** `per_page` / `workItem` → `per-page` / `work-item`. */
export function kebab(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase();
}

/** `plane_list_work_items` → `list-work-items`. */
export function commandName(toolName: string): string {
  return kebab(toolName.replace(/^plane_/, ""));
}

function types(property: ToolInputProperty): string[] {
  if (property.type === undefined) return [];
  return Array.isArray(property.type) ? property.type : [property.type];
}

/** One citty flag per schema property, named in kebab-case. */
export function argsFromSchema(schema: ToolInputSchema): ArgsDef {
  const required = new Set(schema.required ?? []);
  const args: ArgsDef = {};
  for (const [name, property] of Object.entries(schema.properties ?? {})) {
    const kinds = types(property);
    const def: ArgDef = kinds.includes("boolean") ? { type: "boolean" } : { type: "string" };
    if (property.description) def.description = property.description;
    if (required.has(name)) def.required = true;
    if (property.enum) def.valueHint = property.enum.map(String).join("|");
    else if (kinds.includes("array")) def.valueHint = "a,b or JSON";
    else if (kinds.includes("object")) def.valueHint = "JSON";
    else if (kinds.includes("integer") || kinds.includes("number")) def.valueHint = "number";
    args[kebab(name)] = def;
  }
  return args;
}

function coerce(flag: string, property: ToolInputProperty, raw: string | boolean | string[]): unknown {
  const kinds = types(property);
  if (kinds.includes("boolean")) return raw === true || raw === "true";
  const value = Array.isArray(raw) ? raw[raw.length - 1] : String(raw);
  if (kinds.includes("null") && value === "null") return null;
  if (kinds.includes("integer") || kinds.includes("number")) {
    const number = Number(value);
    if (value.trim() === "" || Number.isNaN(number))
      throw new CliInputError(`--${flag} expects a number, got '${value}'.`);
    return number;
  }
  if (kinds.includes("array")) {
    if (value.trim().startsWith("[")) return parseJson(flag, value);
    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  if (kinds.includes("object")) return parseJson(flag, value);
  return value;
}

function parseJson(flag: string, value: string): unknown {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new CliInputError(`--${flag} expects JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/** Parsed flags back to the tool's own argument names, with values of the declared types. */
export function toolArguments(schema: ToolInputSchema, parsed: ParsedArgs): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [name, property] of Object.entries(schema.properties ?? {})) {
    const flag = kebab(name);
    const raw = parsed[flag];
    if (raw === undefined) continue;
    result[name] = coerce(flag, property, raw);
  }
  return result;
}
