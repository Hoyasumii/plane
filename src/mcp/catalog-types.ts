/** Shapes of `generated/catalog.json`, written by `scripts/build-catalog.ts`. */

export type MethodKind = "read" | "write" | "destructive";

export interface CatalogProperty {
  name: string;
  type: string;
  optional: boolean;
}

export interface CatalogParam {
  name: string;
  /** The declared type, as written in the SDK source. */
  type: string;
  optional: boolean;
  /** Top-level properties when the parameter is an object — a params bag or a write body. */
  properties?: CatalogProperty[];
}

export interface CatalogMethod {
  name: string;
  kind: MethodKind;
  doc: string;
  /** The golden operation id the request is made under, when the resource declares one. */
  operationId?: string;
  /** The URL template the method fills. */
  template: string;
  /** Every parameter, in call order. */
  params: CatalogParam[];
  /** The leading params that fill the template's placeholders. */
  pathIds: string[];
  returns: string;
  /** `iterate`-style methods: the result is an async generator that follows pages. */
  paginated: boolean;
  fields?: string[];
  expand?: string[];
  orderBy?: string[];
  filters?: string[];
  pagination?: string[];
}

export interface CatalogResource {
  /** Dotted attribute path under `client.v2`, e.g. `workspaces.projects.states`. */
  resource: string;
  className: string;
  template: string;
  doc: string;
  methods: CatalogMethod[];
}

export interface Catalog {
  generatedFrom: string;
  resources: CatalogResource[];
}
