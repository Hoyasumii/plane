import { PlaneClient } from "../client/plane-client";
import { ToolInputError, findMethod } from "./catalog";

/** Items `plane_call` collects from an `iterate` method when no `limit` is given. */
export const DEFAULT_ITERATE_LIMIT = 100;
/** The most items one `plane_call` will collect from an `iterate` method. */
export const MAX_ITERATE_LIMIT = 1000;
/** Characters of JSON a tool result carries before it is cut, to keep the model's context usable. */
export const MAX_RESULT_CHARS = 60_000;

export interface InvokeOptions {
  /** Named arguments, matched to the method's parameters by name. */
  args?: Record<string, unknown>;
  /** Items to collect from a paginated (`iterate`) method. */
  limit?: number;
  /** Required for destructive methods (`delete`, `bulkDelete`, `remove`, `unlink`). */
  confirm?: boolean;
  /** Values for parameters the caller left out, by name — e.g. the configured workspace `slug`. */
  defaults?: Record<string, unknown>;
}

/**
 * Call `client.v2.<resource>.<method>` with named arguments.
 *
 * Only methods in the catalog can be reached, and their arguments are ordered by the
 * parameter names the SDK declares — the SDK's own validation (fields, order_by, expand,
 * path ids, bulk caps) then runs exactly as it would for a direct call.
 */
export async function invoke(client: PlaneClient, resource: string, method: string, options: InvokeOptions = {}) {
  const { resource: entry, method: found } = findMethod(resource, method);
  const given = options.args ?? {};

  if (found.kind === "destructive" && options.confirm !== true) {
    throw new ToolInputError(
      `${entry.resource}.${found.name} is destructive; call again with confirm: true once the user has agreed.`
    );
  }

  const known = new Set(found.params.map((param) => param.name));
  const unknown = Object.keys(given).filter((name) => !known.has(name));
  if (unknown.length > 0) {
    throw new ToolInputError(
      `Unknown argument(s) for ${entry.resource}.${found.name}: ${unknown.join(", ")}. ` +
        `Expected: ${found.params.map((p) => p.name + (p.optional ? "?" : "")).join(", ")}.`
    );
  }
  const args: Record<string, unknown> = { ...given };
  for (const [name, value] of Object.entries(options.defaults ?? {})) {
    if (known.has(name) && (args[name] === undefined || args[name] === null) && value !== undefined) args[name] = value;
  }
  const positional: unknown[] = [];
  for (const param of found.params) {
    const value = args[param.name];
    if ((value === undefined || value === null) && !param.optional) {
      throw new ToolInputError(
        `${entry.resource}.${found.name} needs '${param.name}' (${param.type}). ` +
          `Use plane_describe for the full signature.`
      );
    }
    positional.push(value ?? undefined);
  }
  while (positional.length > 0 && positional[positional.length - 1] === undefined) positional.pop();

  let target: unknown = client.v2;
  for (const segment of entry.resource.split(".")) {
    target = (target as Record<string, unknown>)[segment];
  }
  const fn = (target as Record<string, unknown>)[found.name];
  if (typeof fn !== "function") {
    // The catalog and the constructed tree disagree — a stale catalog, not a user mistake.
    throw new Error(`client.v2.${entry.resource}.${found.name} is not a function; regenerate the MCP catalog.`);
  }
  const result: unknown = fn.apply(target, positional);

  if (found.paginated) {
    const limit = Math.min(Math.max(1, options.limit ?? DEFAULT_ITERATE_LIMIT), MAX_ITERATE_LIMIT);
    const items: unknown[] = [];
    let more = false;
    for await (const item of result as AsyncIterable<unknown>) {
      if (items.length >= limit) {
        more = true;
        break;
      }
      items.push(item);
    }
    return { items, count: items.length, truncated: more };
  }
  const settled = await result;
  return settled === undefined ? { ok: true } : settled;
}

/**
 * JSON for a tool result. Navigation properties and `$loaded` on loaded rows are
 * non-enumerable, so a row serializes to exactly the data the API returned.
 */
export function toResultText(value: unknown): string {
  const text = JSON.stringify(value, null, 1) ?? "null";
  if (text.length <= MAX_RESULT_CHARS) return text;
  return (
    `${text.slice(0, MAX_RESULT_CHARS)}\n…[truncated: ${text.length} characters in total. ` +
    `Narrow the request with fields, filters, per_page or limit.]`
  );
}
