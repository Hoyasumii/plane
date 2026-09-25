import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PlaneClient } from "../../client/plane-client";
import { ToolInputError, describeMethod, searchCatalog } from "../catalog";
import { errorResult } from "../errors";
import { MAX_ITERATE_LIMIT, invoke, toResultText } from "../invoke";
import type { PlaneMcpRuntime } from "../runtime";

export const V2_UNAVAILABLE =
  "This Plane instance does not serve API v2 (/api/v2 answers 404; self-hosted Plane 1.4.x has only v1), so " +
  "plane_resources and plane_call cannot reach it. Use the typed tools instead: plane_get_issue, " +
  "plane_search_issues, plane_list_my_issues, plane_create_issue, plane_update_issue, plane_list_comments, " +
  "plane_add_comment, plane_list_states/labels/members, plane_list_projects and the *_work_item tools.";

/** `plane_resources`, `plane_describe` and `plane_call`: the whole v2 surface through three tools. */
export function registerGenericTools(
  server: McpServer,
  client: PlaneClient,
  runtime: PlaneMcpRuntime,
  workspace?: string
): void {
  const defaults = workspace ? { slug: workspace } : undefined;
  /** Refuses up front on an instance without `/api/v2`, instead of relaying its 404. */
  const requireV2 = async (): Promise<void> => {
    if ((await runtime.probe.version()) === "v1") throw new ToolInputError(V2_UNAVAILABLE);
  };
  server.registerTool(
    "plane_resources",
    {
      title: "List Plane API resources",
      description:
        "Discover the Plane API: every resource under the v2 client (projects, work items, cycles, modules, " +
        "pages, releases, initiatives, customers, webhooks, …) and its methods. Without a query, lists every " +
        "resource path with its method names; with a query (e.g. 'cycle work items', 'webhook'), shows the " +
        "matching resources with method signatures. Start here when no dedicated plane_* tool fits, then use " +
        "plane_describe and plane_call.",
      inputSchema: { query: z.string().optional().describe("Words to match against resource paths and docs.") },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ query }) => {
      try {
        await requireV2();
        return { content: [{ type: "text", text: searchCatalog(query) }] };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "plane_describe",
    {
      title: "Describe a Plane API method",
      description:
        "Full signature of one method from plane_resources: parameters in order (with write-body fields), " +
        "which are path ids, the allowed fields/expand/order_by/filter values, and an example plane_call input.",
      inputSchema: {
        resource: z.string().describe("Dotted resource path, e.g. 'workspaces.projects.cycles'."),
        method: z.string().describe("Method name, e.g. 'list', 'create', 'add'."),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ resource, method }) => {
      try {
        return { content: [{ type: "text", text: describeMethod(resource, method) }] };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "plane_call",
    {
      title: "Call a Plane API method",
      description:
        "Call any method of the Plane v2 client. Pass arguments by parameter name as plane_describe lists them " +
        "(path ids like slug/project first, then data/params objects). List params accept fields, filters, " +
        "order_by, per_page, offset. 'iterate' methods follow pages and return up to `limit` items. " +
        "Destructive methods (delete, bulkDelete, remove, unlink) need confirm: true — ask the user first.",
      inputSchema: {
        resource: z.string().describe("Dotted resource path, e.g. 'workspaces.projects.states'."),
        method: z.string().describe("Method name, e.g. 'list'."),
        args: z
          .record(z.string(), z.unknown())
          .optional()
          .describe(
            'Arguments by parameter name, e.g. {"slug": "acme", "project": "ENG", "params": {"per_page": 20}}.' +
              (workspace ? ` slug defaults to '${workspace}'.` : "")
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(MAX_ITERATE_LIMIT)
          .optional()
          .describe("For iterate methods: how many items to collect (default 100)."),
        confirm: z.boolean().optional().describe("Must be true to run a destructive method."),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
    },
    async ({ resource, method, args, limit, confirm }) => {
      try {
        await requireV2();
        const result = await invoke(client, resource, method, { args, limit, confirm, defaults });
        return { content: [{ type: "text", text: toResultText(result) }] };
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
