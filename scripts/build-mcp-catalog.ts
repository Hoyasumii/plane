/**
 * Writes `src/mcp/generated/catalog.json`: every v2 resource reachable from `client.v2`, every
 * public method on it, and what the golden says each method's operation accepts.
 *
 * The runtime erases parameter names, optionality and doc comments, so they are read off
 * the TypeScript AST — through the same enumeration the SDK's rule sweeps use
 * (`tests/unit/v2/tree-walk.ts`), so the MCP server sees exactly the set those sweeps see.
 *
 * Usage: pnpm codegen:mcp
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as ts from "typescript";
import { EXPAND, FIELDS, FILTERS, ORDER_BY, PAGINATION } from "../src/api/v2/generated/constants";
import {
  AnyResource,
  instantiate,
  ResourceEntry,
  extraPathsOf,
  operationActionFor,
  operationsOf,
  pathOf,
  program,
  reachableResources,
  resourceEntries,
} from "../tests/unit/v2/tree-walk";
import type { Catalog, CatalogMethod, CatalogParam, CatalogResource, MethodKind } from "../src/mcp/catalog-types";

const OUT = path.join(__dirname, "../src/mcp/generated/catalog.json");
const MAX_TYPE_TEXT = 160;
const MAX_PROPERTIES = 80;

const DESTRUCTIVE = new Set(["delete", "bulkDelete", "remove", "unlink"]);
const READ = new Set([
  "list",
  "iterate",
  "retrieve",
  "retrieveByIdentifier",
  "default",
  "me",
  "summary",
  "roleDistribution",
  "schema",
  "search",
]);

function kindOf(method: string): MethodKind {
  if (DESTRUCTIVE.has(method)) return "destructive";
  if (READ.has(method) || /^findBy[A-Z]/.test(method)) return "read";
  return "write";
}

function clip(text: string): string {
  const flat = text.replace(/\s+/g, " ");
  return flat.length > MAX_TYPE_TEXT ? `${flat.slice(0, MAX_TYPE_TEXT - 1)}…` : flat;
}

function lookup(table: Record<string, readonly string[]>, operationId: string | undefined): string[] | undefined {
  if (operationId === undefined) return undefined;
  const values = table[operationId];
  return values === undefined || values.length === 0 ? undefined : [...values];
}

/** Top-level properties of an object-typed parameter — a params bag or a write body. */
function propertiesOf(parameter: ts.ParameterDeclaration, checker: ts.TypeChecker): CatalogParam["properties"] {
  const type = checker.getNonNullableType(checker.getTypeAtLocation(parameter));
  if (checker.isArrayLikeType(type)) return undefined;
  if (type.flags & (ts.TypeFlags.StringLike | ts.TypeFlags.NumberLike | ts.TypeFlags.BooleanLike)) return undefined;
  const properties = checker.getPropertiesOfType(type);
  if (properties.length === 0) return undefined;
  return properties.slice(0, MAX_PROPERTIES).map((symbol) => ({
    name: symbol.getName(),
    type: clip(checker.typeToString(checker.getTypeOfSymbolAtLocation(symbol, parameter))),
    optional: (symbol.flags & ts.SymbolFlags.Optional) !== 0,
  }));
}

function paramsOf(signature: ts.SignatureDeclaration, checker: ts.TypeChecker): CatalogParam[] {
  return signature.parameters.map((parameter) => {
    const name = ts.isIdentifier(parameter.name) ? parameter.name.text : "<destructured>";
    const type = checker.getTypeAtLocation(parameter);
    return {
      name,
      type: clip(parameter.type ? parameter.type.getText() : checker.typeToString(type)),
      optional: parameter.questionToken !== undefined || parameter.initializer !== undefined,
      properties: propertiesOf(parameter, checker),
    };
  });
}

/** The leading params that fill the URL template's placeholders, in path order. */
function pathIdsOf(template: string, params: CatalogParam[]): string[] {
  const placeholders = [...template.matchAll(/\{(\w+)\}/g)].length;
  return params.slice(0, placeholders).map((p) => p.name);
}

function methodsOf(declaration: ts.ClassDeclaration, resource: AnyResource, checker: ts.TypeChecker): CatalogMethod[] {
  const operations = operationsOf(resource) as Record<string, string>;
  const extraPaths = extraPathsOf(resource);
  const byName = new Map<string, ts.SignatureDeclaration[]>();
  for (const member of declaration.members) {
    if (!ts.isMethodDeclaration(member) || !ts.isIdentifier(member.name)) continue;
    const modifiers = ts.getCombinedModifierFlags(member);
    if (modifiers & (ts.ModifierFlags.Private | ts.ModifierFlags.Protected | ts.ModifierFlags.Static)) continue;
    const name = member.name.text;
    if (name.startsWith("_")) continue;
    byName.set(name, [...(byName.get(name) ?? []), member]);
  }

  const methods: CatalogMethod[] = [];
  for (const [name, declarations] of byName) {
    // The implementation (the declaration with a body) carries the full, general parameter list.
    const implementation = declarations.find((d) => (d as ts.MethodDeclaration).body !== undefined) ?? declarations[0];
    const params = paramsOf(implementation, checker);
    const docs = declarations
      .map((d) => {
        const symbol = checker.getSymbolAtLocation((d as ts.MethodDeclaration).name);
        return ts.displayPartsToString(symbol?.getDocumentationComment(checker) ?? []);
      })
      .filter((text) => text.trim().length > 0);
    const doc = docs[docs.length - 1] ?? "";
    const returnType = implementation.type?.getText() ?? "";
    const action = operationActionFor(name);
    const operationId = operations[action];
    const template = extraPaths[name] ?? pathOf(resource);
    methods.push({
      name,
      kind: kindOf(name),
      doc: doc.replace(/\s+/g, " ").trim(),
      operationId,
      template,
      params,
      pathIds: pathIdsOf(template, params),
      returns: clip(returnType),
      paginated: returnType.startsWith("AsyncGenerator"),
      fields: lookup(FIELDS, operationId),
      expand: lookup(EXPAND, operationId),
      orderBy: lookup(ORDER_BY, operationId),
      filters: lookup(FILTERS, operationId),
      pagination: lookup(PAGINATION, operationId),
    });
  }
  return methods.sort((a, b) => a.name.localeCompare(b.name));
}

/** The catalog, derived fresh from the source. `catalog.test.ts` compares it to the committed file. */
export function buildCatalog(): Catalog {
  const checker = program().getTypeChecker();
  const entries = new Map<unknown, ResourceEntry>();
  for (const entry of resourceEntries()) entries.set(entry.cls, entry);

  const resources: CatalogResource[] = [];
  for (const [cls, dotted] of reachableResources()) {
    const entry = entries.get(cls);
    if (entry === undefined) throw new Error(`No source declaration for ${dotted}`);
    const { declaration } = entry;
    const instance = instantiate(entry);
    const doc = ts.displayPartsToString(
      checker.getSymbolAtLocation(declaration.name!)?.getDocumentationComment(checker) ?? []
    );
    resources.push({
      resource: dotted.replace(/^v2\./, ""),
      className: declaration.name!.text,
      template: pathOf(instance),
      doc: doc.replace(/\s+/g, " ").trim(),
      methods: methodsOf(declaration, instance, checker),
    });
  }
  resources.sort((a, b) => a.resource.localeCompare(b.resource));

  return { generatedFrom: "src/api/v2", resources };
}

function main(): void {
  const catalog = buildCatalog();
  const { resources } = catalog;
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(catalog)}\n`);
  const methodCount = resources.reduce((sum, r) => sum + r.methods.length, 0);
  console.log(`catalog: ${resources.length} resources, ${methodCount} methods → ${path.relative(process.cwd(), OUT)}`);
}

if (require.main === module) main();
