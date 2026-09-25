import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { PlaneClient } from "../../client/plane-client";
import { ToolInputError } from "../catalog";
import { errorResult } from "../errors";
import { invoke, toResultText } from "../invoke";
import type { PlaneMcpRuntime } from "../runtime";
import { createWorkItemV1, listWorkItemsV1, updateWorkItemV1, v1WorkItem } from "./work-items-v1";

/** `ENG-123`: a project identifier, a dash, a sequence number. */
const IDENTIFIER = /^[A-Za-z0-9]+-\d+$/;

const slugSchema = z.string().min(1).describe("Workspace slug (the part after the host in the Plane URL).");
const project = z.string().min(1).describe("Project UUID or its identifier, e.g. 'ENG'.");
const workItem = z.string().min(1).describe("Work item identifier like 'ENG-123', or its UUID.");
const perPage = z.number().int().min(1).max(100).optional().describe("Page size (default server-side).");
const offset = z.number().int().min(0).optional().describe("Rows to skip, for the next page.");
const search = z.string().optional().describe("Free-text search.");
const priority = z.enum(["none", "low", "medium", "high", "urgent"]);

const workItemFields = {
  name: z.string().min(1),
  description_html: z.string().optional().describe("Description as HTML, e.g. '<p>text</p>'."),
  state: z.string().optional().describe("State name, e.g. 'In Progress'."),
  state_id: z.string().optional(),
  priority: priority.optional(),
  assignees: z.array(z.string()).optional().describe("Assignee emails."),
  assignee_ids: z.array(z.string()).optional(),
  labels: z.array(z.string()).optional().describe("Label names."),
  label_ids: z.array(z.string()).optional(),
  parent: z.string().optional().describe("Parent work item identifier or id."),
  type: z.string().optional().describe("Work item type name."),
  start_date: z.string().optional().describe("YYYY-MM-DD."),
  target_date: z.string().optional().describe("YYYY-MM-DD, not before start_date."),
  estimate: z.string().optional(),
  cycle_id: z.string().nullable().optional(),
};

async function run(work: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    return { content: [{ type: "text", text: toResultText(await work()) }] };
  } catch (error) {
    return errorResult(error);
  }
}

function compact(values: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
}

/**
 * The project and UUID behind a work item reference. An identifier (`ENG-123`) is
 * resolved through the workspace-wide lookup, so no project needs to be known.
 */
async function resolveWorkItem(
  client: PlaneClient,
  slugValue: string,
  reference: string,
  projectValue?: string
): Promise<{ project: string; workItem: string }> {
  if (!IDENTIFIER.test(reference)) {
    if (!projectValue) {
      throw new Error(`'${reference}' is not an identifier like ENG-123; pass its project too.`);
    }
    return { project: projectValue, workItem: reference };
  }
  const row = (await invoke(client, "workspaces.workItems", "retrieveByIdentifier", {
    args: { slug: slugValue, identifier: reference.toUpperCase(), params: { fields: ["id", "project_id"] } },
  })) as { id: string; project_id?: string };
  return { project: row.project_id ?? projectValue ?? reference.split("-")[0], workItem: row.id };
}

/**
 * Typed work item tools over v2; everything else goes through `plane_call`. On an instance
 * without `/api/v2` they answer through v1 (`work-items-v1.ts`).
 *
 * With a default `workspace`, `slug` becomes optional on every tool and falls back to it.
 */
export function registerCuratedTools(
  server: McpServer,
  client: PlaneClient,
  runtime: PlaneMcpRuntime,
  workspace?: string
): void {
  const { v1, probe } = runtime;
  /** True when the instance has no `/api/v2`: the tools then answer through v1. */
  const onV1 = async (): Promise<boolean> => (await probe.version()) === "v1";
  const slug: z.ZodType<string | undefined> = workspace
    ? slugSchema.optional().describe(`Workspace slug. Default: '${workspace}'.`)
    : slugSchema;
  const slugOf = (value: string | undefined): string => {
    const resolved = value ?? workspace;
    if (!resolved) throw new ToolInputError("slug is required: no default workspace is configured.");
    return resolved;
  };
  const read = { readOnlyHint: true, openWorldHint: true } as const;
  const write = { readOnlyHint: false, destructiveHint: false, openWorldHint: true } as const;

  server.registerTool(
    "plane_list_work_items",
    {
      title: "List or search work items",
      description:
        "Work items in one project, or across the workspace when project is omitted. Filter by text, state, " +
        "state group, assignee, label, priority, cycle or module. For more filters use plane_describe on " +
        "workspaces.projects.workItems list.",
      inputSchema: {
        slug,
        project: project.optional(),
        search,
        state_id: z.string().optional(),
        state_group: z.enum(["backlog", "unstarted", "started", "completed", "cancelled", "triage"]).optional(),
        assignee_id: z.string().optional(),
        label_id: z.string().optional(),
        priority: priority.optional(),
        cycle_id: z.string().optional(),
        module_id: z.string().optional(),
        order_by: z.string().optional().describe("e.g. '-updated_at'."),
        fields: z.array(z.string()).optional().describe("Only these fields, e.g. ['name','state_id']."),
        per_page: perPage,
        offset,
      },
      annotations: read,
    },
    async ({ slug: s, project: p, ...params }) =>
      run(async () =>
        (await onV1())
          ? listWorkItemsV1(v1, slugOf(s), { project: p, ...params })
          : p
            ? invoke(client, "workspaces.projects.workItems", "list", {
                args: { slug: slugOf(s), project: p, params: compact(params) },
              })
            : invoke(client, "workspaces.workItems", "list", { args: { slug: slugOf(s), params: compact(params) } })
      )
  );

  server.registerTool(
    "plane_get_work_item",
    {
      title: "Get a work item",
      description: "One work item by identifier (ENG-123) or by UUID plus project.",
      inputSchema: {
        slug,
        workItem,
        project: project.optional().describe("Needed only when workItem is a UUID."),
        expand: z.array(z.string()).optional().describe("Related objects to inline, e.g. ['state','labels']."),
      },
      annotations: read,
    },
    async ({ slug: s, workItem: w, project: p, expand }) =>
      run(async () => {
        if (await onV1()) {
          if (expand !== undefined) {
            throw new ToolInputError("expand requires Plane API v2, which this instance does not serve.");
          }
          return v1WorkItem(v1, slugOf(s), w, p);
        }
        const params = compact({ expand });
        if (IDENTIFIER.test(w)) {
          return invoke(client, "workspaces.workItems", "retrieveByIdentifier", {
            args: { slug: slugOf(s), identifier: w.toUpperCase(), params },
          });
        }
        const ref = await resolveWorkItem(client, slugOf(s), w, p);
        return invoke(client, "workspaces.projects.workItems", "retrieve", {
          args: { slug: slugOf(s), project: ref.project, workItem: ref.workItem, params },
        });
      })
  );

  server.registerTool(
    "plane_create_work_item",
    {
      title: "Create a work item",
      description:
        "Create a work item in a project. State, labels, assignees, parent and type accept readable values " +
        "(names, emails, identifiers) as well as ids.",
      inputSchema: { slug, project, ...workItemFields },
      annotations: write,
    },
    async ({ slug: s, project: p, ...data }) =>
      run(async () =>
        (await onV1())
          ? createWorkItemV1(v1, slugOf(s), p, data)
          : invoke(client, "workspaces.projects.workItems", "create", {
              args: { slug: slugOf(s), project: p, data: compact(data) },
            })
      )
  );

  server.registerTool(
    "plane_update_work_item",
    {
      title: "Update a work item",
      description: "Change fields of a work item; only the fields given are sent.",
      inputSchema: {
        slug,
        workItem,
        project: project.optional().describe("Needed only when workItem is a UUID."),
        ...workItemFields,
        name: z.string().min(1).optional(),
      },
      annotations: write,
    },
    async ({ slug: s, workItem: w, project: p, ...data }) =>
      run(async () => {
        if (await onV1()) return updateWorkItemV1(v1, slugOf(s), w, p, data);
        const ref = await resolveWorkItem(client, slugOf(s), w, p);
        return invoke(client, "workspaces.projects.workItems", "update", {
          args: { slug: slugOf(s), project: ref.project, workItem: ref.workItem, data: compact(data) },
        });
      })
  );
}
