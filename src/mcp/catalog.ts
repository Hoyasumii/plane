import catalogJson from "./generated/catalog.json";
import { Catalog, CatalogMethod, CatalogResource } from "./catalog-types";

/** Every v2 resource and method, as `scripts/build-mcp-catalog.ts` read them off the SDK source. */
export const CATALOG: Catalog = catalogJson as unknown as Catalog;

const RESOURCES = new Map<string, CatalogResource>(CATALOG.resources.map((entry) => [entry.resource, entry]));

/** Thrown for a request the model can fix by changing its arguments; its message is shown verbatim. */
export class ToolInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolInputError";
  }
}

export function findResource(resource: string): CatalogResource {
  const found = RESOURCES.get(resource.replace(/^v2\./, ""));
  if (found === undefined) {
    const close = CATALOG.resources
      .map((entry) => entry.resource)
      .filter((name) => name.toLowerCase().includes(resource.split(".").pop()?.toLowerCase() ?? ""))
      .slice(0, 10);
    throw new ToolInputError(
      `Unknown resource '${resource}'.` +
        (close.length > 0 ? ` Did you mean: ${close.join(", ")}?` : "") +
        " Use plane_resources to list them."
    );
  }
  return found;
}

export function findMethod(resource: string, method: string): { resource: CatalogResource; method: CatalogMethod } {
  const entry = findResource(resource);
  const found = entry.methods.find((candidate) => candidate.name === method);
  if (found === undefined) {
    throw new ToolInputError(
      `'${entry.resource}' has no method '${method}'. Methods: ${entry.methods.map((m) => m.name).join(", ")}.`
    );
  }
  return { resource: entry, method: found };
}

/** One line per method: `name(params) [kind] — doc`. */
export function signatureOf(method: CatalogMethod): string {
  const params = method.params.map((param) => `${param.name}${param.optional ? "?" : ""}`).join(", ");
  return `${method.name}(${params})`;
}

function firstSentence(text: string): string {
  const match = /^(.+?[.!?])(\s|$)/.exec(text);
  const sentence = match ? match[1] : text;
  return sentence.length > 140 ? `${sentence.slice(0, 139)}…` : sentence;
}

/**
 * Resources whose path, class name, URL template or docs match every word of `query`,
 * rendered compactly. With no query, every resource with its method names only.
 */
export function searchCatalog(query?: string): string {
  const words = (query ?? "")
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  const matches = CATALOG.resources.filter((entry) => {
    const haystack = [entry.resource, entry.className, entry.template, entry.doc, ...entry.methods.map((m) => m.name)]
      .join(" ")
      .toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
  if (matches.length === 0) return `No resource matches '${query}'. Try a shorter query, or none to list all.`;

  if (words.length === 0) {
    return [
      `${matches.length} resources under client.v2 (call plane_resources with a query for signatures, plane_describe for details):`,
      ...matches.map((entry) => `- ${entry.resource}: ${entry.methods.map((m) => m.name).join(", ")}`),
    ].join("\n");
  }
  return matches
    .map((entry) =>
      [
        `## ${entry.resource}  (${entry.template})`,
        entry.doc ? firstSentence(entry.doc) : undefined,
        ...entry.methods.map((m) => `- ${signatureOf(m)} [${m.kind}]${m.doc ? ` — ${firstSentence(m.doc)}` : ""}`),
      ]
        .filter((line) => line !== undefined)
        .join("\n")
    )
    .join("\n\n");
}

/** Everything the model needs to call one method through `plane_call`. */
export function describeMethod(resource: string, method: string): string {
  const { resource: entry, method: found } = findMethod(resource, method);
  const lines: string[] = [
    `${entry.resource}.${signatureOf(found)}  [${found.kind}]`,
    `URL template: ${found.template}`,
    `Returns: ${found.returns}${found.paginated ? " (plane_call collects pages up to `limit`)" : ""}`,
  ];
  if (found.doc) lines.push("", found.doc);
  lines.push("", "Parameters (pass them by name in plane_call's `args`):");
  for (const param of found.params) {
    const role = found.pathIds.includes(param.name) ? " — path id" : "";
    lines.push(`- ${param.name}${param.optional ? " (optional)" : ""}: ${param.type}${role}`);
    for (const property of param.properties ?? []) {
      lines.push(`    - ${property.name}${property.optional ? "?" : ""}: ${property.type}`);
    }
  }
  const allowed: [string, string[] | undefined][] = [
    ["fields", found.fields],
    ["expand", found.expand],
    ["order_by", found.orderBy],
    ["filters", found.filters],
    ["pagination", found.pagination],
  ];
  for (const [label, values] of allowed) {
    if (values !== undefined) lines.push("", `Allowed ${label}: ${values.join(", ")}`);
  }
  if (found.kind === "destructive") lines.push("", "Destructive: plane_call requires `confirm: true`.");

  const example: Record<string, unknown> = {};
  for (const param of found.params) {
    if (param.optional) continue;
    example[param.name] = param.properties ? {} : `<${param.name}>`;
  }
  lines.push(
    "",
    "Example plane_call input:",
    JSON.stringify({
      resource: entry.resource,
      method: found.name,
      args: example,
      ...(found.kind === "destructive" ? { confirm: true } : {}),
    })
  );
  return lines.join("\n");
}
