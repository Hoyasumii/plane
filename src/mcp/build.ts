import * as fs from "node:fs";
import * as path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PlaneClient } from "../client/plane-client";
import { CATALOG } from "./catalog";
import { PlaneMcpRuntime, createPlaneMcpRuntime } from "./runtime";
import { registerCuratedTools } from "./tools/curated";
import { registerGenericTools } from "./tools/generic";
import { registerKitTools } from "./tools/kit";

export const SERVER_NAME = "plane";
/** The package's own `package.json`, read at runtime: `src/mcp/` and `dist/mcp/` both sit two levels below it. */
const PACKAGE_JSON = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "package.json"), "utf8")) as {
  version: string;
  homepage: string;
};
export const SERVER_VERSION = PACKAGE_JSON.version;
/** The documentation site, the package's `homepage`. */
export const DOCS_URL = PACKAGE_JSON.homepage;

export interface BuildPlaneMcpServerOptions {
  /** A default workspace slug: tools that take `slug` fall back to it when it is omitted. */
  workspace?: string;
  /**
   * The cache and API-version probe to share across servers. {@link startPlaneMcpServer}
   * passes one per process; without it, this server gets its own.
   */
  runtime?: PlaneMcpRuntime;
}

/**
 * An MCP server exposing Plane, with no transport attached.
 *
 * The task tools (`plane_get_issue`, `plane_update_issue`, `plane_add_comment`, …) work by
 * key and by name over API v1; the `*_work_item` tools use v2 and fall back to v1 on an
 * instance without it; `plane_resources` / `plane_describe` / `plane_call` reach every
 * other v2 method. Connect it to any transport — {@link startPlaneMcpServer} serves it over HTTP.
 */

export function buildPlaneMcpServer(client: PlaneClient, options: BuildPlaneMcpServerOptions = {}): McpServer {
  const { workspace } = options;
  const runtime = options.runtime ?? createPlaneMcpRuntime(client);
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions:
        "Plane project management. Tasks go by key (ACME-130) through plane_get_issue, plane_update_issue, " +
        "plane_create_issue, plane_add_comment, plane_list_comments, plane_search_issues and " +
        "plane_list_my_issues; projects, states, labels and members go by name. For anything else (cycles, modules, pages, releases, initiatives, customers, " +
        `webhooks, … — ${CATALOG.resources.length} resources in all), find it with plane_resources, read its ` +
        "signature with plane_describe, then run it with plane_call. " +
        (workspace
          ? `The default workspace is '${workspace}': omit slug to use it. `
          : "Every call needs the workspace slug; ask the user for it if unknown. ") +
        "Ask before anything destructive.",
    }
  );
  registerKitTools(server, runtime, workspace);
  registerCuratedTools(server, client, runtime, workspace);
  registerGenericTools(server, client, runtime, workspace);
  return server;
}
