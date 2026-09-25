/**
 * `@hoyasumii/plane/mcp` — an MCP server over this SDK's v2 client.
 *
 * `servePlaneMcpStdio({ baseUrl, apiKey })` serves it over stdio;
 * `startPlaneMcpServer({ port, baseUrl, apiKey })` serves it over HTTP;
 * `buildPlaneMcpServer(client)` gives the bare `McpServer` for any other transport.
 *
 * @module @hoyasumii/plane/mcp
 */
export { servePlaneMcpStdio } from "./stdio";
export type { PlaneMcpStdioOptions, RunningPlaneMcpStdio } from "./stdio";
export { startPlaneMcpServer } from "./server";
export type { PlaneMcpServerOptions, RunningPlaneMcpServer } from "./server";
export { buildPlaneMcpServer, SERVER_NAME, SERVER_VERSION } from "./build";
export type { BuildPlaneMcpServerOptions } from "./build";
export { CONFIG_KEYS, configDir, configFilePath, readEnvFile, resolveMcpConfig, writeEnvFile } from "./config";
export type { ConfigKey, ConfigValues, McpConfig, McpConfigFlags } from "./config";
export { CATALOG, describeMethod, searchCatalog, ToolInputError } from "./catalog";
export type {
  Catalog,
  CatalogMethod,
  CatalogParam,
  CatalogProperty,
  CatalogResource,
  MethodKind,
} from "./catalog-types";
export { invoke, DEFAULT_ITERATE_LIMIT, MAX_ITERATE_LIMIT, MAX_RESULT_CHARS } from "./invoke";
export type { InvokeOptions } from "./invoke";
