import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { errorResult } from "../errors";
import { toResultText } from "../invoke";
import type { PlaneMcpRuntime } from "../runtime";
import { ToolInputError } from "../catalog";
import { htmlImages, htmlToText, parseIssueKey, textToHtml } from "../v1/text";
import { IssueWrite, OPEN_GROUPS, PRIORITIES, STATE_GROUPS, V1Issue, idOf } from "../v1/workspace";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD");
const key = z.string().describe("Task key, e.g. ACME-130.");
const project = z.string().describe("Project identifier, name or id (e.g. ACME).");

async function run(work: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    return { content: [{ type: "text", text: toResultText(await work()) }] };
  } catch (error) {
    return errorResult(error);
  }
}

/**
 * The task tools agent workflows call, with a stable contract: tasks by key (`ACME-130`), projects/states/labels/members by name, readable
 * output with no ids. Always over API v1, which both Plane Cloud and self-hosted serve.
 * None of them deletes anything.
 */
export function registerKitTools(server: McpServer, runtime: PlaneMcpRuntime, workspace?: string): void {
  const { v1, probe } = runtime;
  const slug = z
    .string()
    .min(1)
    .optional()
    .describe(workspace ? `Workspace slug. Default: '${workspace}'.` : "Workspace slug (required: no default).");
  const slugOf = (value: string | undefined): string => {
    const resolved = value ?? workspace;
    if (!resolved) throw new ToolInputError("slug is required: no default workspace is configured (PLANE_WORKSPACE).");
    return resolved;
  };
  const read = { readOnlyHint: true, openWorldHint: true } as const;
  const write = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true } as const;

  server.registerTool(
    "plane_whoami",
    {
      title: "Current Plane user",
      description: "The user behind the API key, the workspace in use and which Plane API the instance serves.",
      inputSchema: {},
      annotations: read,
    },
    async () =>
      run(async () => {
        const me = await v1.me();
        const api = await probe.version().catch(() => probe.current ?? "unknown");
        return { id: me.id, display_name: me.display_name, email: me.email, workspace, base_url: v1.baseUrl, api };
      })
  );

  server.registerTool(
    "plane_list_projects",
    {
      title: "List projects",
      description: "Projects of the workspace, with the identifier used in task keys (e.g. ACME).",
      inputSchema: { slug },
      annotations: read,
    },
    async ({ slug: s }) =>
      run(async () => (await v1.projects(slugOf(s))).map((p) => ({ identifier: p.identifier, name: p.name, id: p.id })))
  );

  server.registerTool(
    "plane_list_my_issues",
    {
      title: "My tasks",
      description:
        "Tasks assigned to the API key's user. By default only open ones (backlog, unstarted, started), most " +
        "recently updated first.",
      inputSchema: {
        slug,
        project: project.optional().describe("Project identifier or name (e.g. ACME). Omitted: every project."),
        state_groups: z.array(z.enum(STATE_GROUPS)).optional().describe("State groups to include. Default: open."),
        limit: z.number().int().min(1).max(200).default(50),
      },
      annotations: read,
    },
    async ({ slug: s, project: p, state_groups, limit }) =>
      run(async () => {
        const ws = slugOf(s);
        const me = await v1.me();
        const projects = p ? [await v1.resolveProject(ws, p)] : await v1.projects(ws);
        const all: V1Issue[] = [];
        for (const each of projects) all.push(...(await v1.listProjectIssues(ws, each.id)));
        const mine = await v1.filterIssues(ws, all, { assigneeIds: [me.id], stateGroups: state_groups ?? OPEN_GROUPS });
        return v1.summarize(ws, mine, limit);
      })
  );

  server.registerTool(
    "plane_search_issues",
    {
      title: "Search tasks",
      description: "Tasks of a project by text (title/description), assignee and state group.",
      inputSchema: {
        slug,
        project,
        query: z.string().optional().describe("Text contained in the title or description."),
        assignee: z.string().optional().describe('Name, email or "me".'),
        state_groups: z.array(z.enum(STATE_GROUPS)).optional().describe("Default: all."),
        limit: z.number().int().min(1).max(200).default(30),
      },
      annotations: read,
    },
    async ({ slug: s, project: p, query, assignee, state_groups, limit }) =>
      run(async () => {
        const ws = slugOf(s);
        const found = await v1.resolveProject(ws, p);
        const assigneeIds = assignee ? await v1.resolveMembers(ws, found.id, [assignee]) : undefined;
        const issues = await v1.filterIssues(ws, await v1.listProjectIssues(ws, found.id), {
          query,
          assigneeIds,
          stateGroups: state_groups,
        });
        return v1.summarize(ws, issues, limit);
      })
  );

  server.registerTool(
    "plane_get_issue",
    {
      title: "Get a task",
      description:
        "A task by key (e.g. ACME-130), with its description as text. Description images become '[image n]' " +
        "in the text and are listed in `images`; download them with plane_get_issue_images.",
      inputSchema: { slug, key },
      annotations: read,
    },
    async ({ slug: s, key: k }) =>
      run(async () => {
        const ws = slugOf(s);
        return v1.describeIssue(ws, await v1.getIssueByKey(ws, k));
      })
  );

  server.registerTool(
    "plane_get_issue_images",
    {
      title: "Download description images",
      description:
        "Download the images of a task's description to local files (image-<n>.<ext>), numbered like the " +
        "'[image n]' markers of plane_get_issue, to read with a file-reading tool. One image failing does not " +
        "stop the others.",
      inputSchema: {
        slug,
        key,
        dir: z
          .string()
          .optional()
          .describe("Absolute target folder (created if missing). Default: <system tmp>/plane-mcp/<KEY>."),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ slug: s, key: k, dir }) =>
      run(async () => {
        if (dir !== undefined && !isAbsolute(dir)) throw new ToolInputError(`dir must be an absolute path: "${dir}".`);
        const ws = slugOf(s);
        const { identifier, sequence } = parseIssueKey(k);
        const issue = await v1.getIssueByKey(ws, k);
        const projectId = idOf(issue.project) ?? "";
        const target = dir ?? join(tmpdir(), "plane-mcp", `${identifier}-${sequence}`);
        const images = htmlImages(issue.description_html);
        if (images.length) await mkdir(target, { recursive: true });

        const results: Record<string, unknown>[] = [];
        for (const image of images) {
          if (!("asset_id" in image)) {
            results.push({ ...image, error: "image is not a Plane asset (external src); open the task in a browser" });
            continue;
          }
          try {
            const { buffer, ext, content_type } = await v1.downloadIssueImage(ws, projectId, issue.id, image.asset_id);
            const file = join(target, `image-${image.n}.${ext}`);
            await writeFile(file, buffer);
            results.push({ ...image, file, content_type, bytes: buffer.length });
          } catch (error) {
            results.push({ ...image, error: error instanceof Error ? error.message : String(error) });
          }
        }
        return { key: `${identifier}-${sequence}`, dir: images.length ? target : null, images: results };
      })
  );

  server.registerTool(
    "plane_list_comments",
    {
      title: "Task comments",
      description: "Comments of a task, oldest first: author, created_at, text.",
      inputSchema: { slug, key },
      annotations: read,
    },
    async ({ slug: s, key: k }) =>
      run(async () => {
        const ws = slugOf(s);
        const issue = await v1.getIssueByKey(ws, k);
        const projectId = idOf(issue.project) ?? "";
        const [comments, members] = await Promise.all([
          v1.listComments(ws, projectId, issue.id),
          v1.members(ws, projectId),
        ]);
        const who = (id: string | undefined): string => {
          const found = members.find((m) => m.id === id);
          return found ? found.display_name || found.email || found.id : String(id);
        };
        return comments
          .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
          .map((c) => ({
            author: who(idOf(c.actor) ?? c.created_by),
            created_at: c.created_at,
            text: c.comment_stripped?.trim() || htmlToText(c.comment_html),
          }));
      })
  );

  server.registerTool(
    "plane_add_comment",
    {
      title: "Comment on a task",
      description:
        'Add a comment as the API key\'s user. format "text" (default): plain text, each line a paragraph. ' +
        'format "markdown": renders headings, lists, checkboxes and bold; raw HTML is escaped.',
      inputSchema: {
        slug,
        key,
        text: z.string().min(1),
        format: z.enum(["text", "markdown"]).default("text"),
      },
      annotations: write,
    },
    async ({ slug: s, key: k, text, format }) =>
      run(async () => {
        const ws = slugOf(s);
        const issue = await v1.getIssueByKey(ws, k);
        const comment = await v1.addComment(ws, idOf(issue.project) ?? "", issue.id, text, format);
        const { identifier, sequence } = parseIssueKey(k);
        return { created: true, key: `${identifier}-${sequence}`, comment_id: comment?.id };
      })
  );

  server.registerTool(
    "plane_create_issue",
    {
      title: "Create a task",
      description: "Create a task. State, labels and assignees by name; the default assignee is the API key's user.",
      inputSchema: {
        slug,
        project,
        title: z.string().min(1),
        description: z.string().optional().describe("Plain text."),
        state: z.string().optional().describe("State name. Default: the project's default."),
        priority: z.enum(PRIORITIES).optional(),
        assignees: z.array(z.string()).optional().describe('Names, emails or "me". Default: ["me"]. [] for none.'),
        labels: z.array(z.string()).optional().describe("Label names."),
        start_date: date.optional(),
        target_date: date.optional(),
      },
      annotations: write,
    },
    async ({ slug: s, ...a }) =>
      run(async () => {
        const ws = slugOf(s);
        const p = await v1.resolveProject(ws, a.project);
        const body: IssueWrite = { name: a.title, assignees: await v1.resolveMembers(ws, p.id, a.assignees ?? ["me"]) };
        if (a.description !== undefined) body.description_html = textToHtml(a.description);
        if (a.state) body.state = (await v1.resolveState(ws, p.id, a.state)).id;
        if (a.priority) body.priority = a.priority;
        if (a.labels) body.labels = await v1.resolveLabels(ws, p.id, a.labels);
        if (a.start_date) body.start_date = a.start_date;
        if (a.target_date) body.target_date = a.target_date;
        const created = await v1.createIssue(ws, p.id, body);
        return v1.describeIssue(ws, { ...created, project: idOf(created.project) ?? p.id });
      })
  );

  server.registerTool(
    "plane_update_issue",
    {
      title: "Update a task",
      description:
        "Change fields of a task by key. Only the fields given change; assignees and labels replace the whole " +
        "list. Dates: YYYY-MM-DD, or null to clear.",
      inputSchema: {
        slug,
        key,
        title: z.string().min(1).optional(),
        description: z.string().optional().describe("Plain text; replaces the whole description."),
        state: z.string().optional().describe("State name (see plane_list_states)."),
        priority: z.enum(PRIORITIES).optional(),
        assignees: z.array(z.string()).optional().describe('Names, emails or "me"; replaces the list.'),
        labels: z.array(z.string()).optional().describe("Label names; replaces the list."),
        start_date: date.nullable().optional(),
        target_date: date.nullable().optional(),
      },
      annotations: write,
    },
    async ({ slug: s, key: k, ...a }) =>
      run(async () => {
        const ws = slugOf(s);
        const issue = await v1.getIssueByKey(ws, k);
        const projectId = idOf(issue.project) ?? "";
        const body: IssueWrite = {};
        if (a.title !== undefined) body.name = a.title;
        if (a.description !== undefined) body.description_html = textToHtml(a.description);
        if (a.state !== undefined) body.state = (await v1.resolveState(ws, projectId, a.state)).id;
        if (a.priority !== undefined) body.priority = a.priority;
        if (a.assignees !== undefined) body.assignees = await v1.resolveMembers(ws, projectId, a.assignees);
        if (a.labels !== undefined) body.labels = await v1.resolveLabels(ws, projectId, a.labels);
        if (a.start_date !== undefined) body.start_date = a.start_date;
        if (a.target_date !== undefined) body.target_date = a.target_date;
        if (Object.keys(body).length === 0) throw new ToolInputError("Nothing to change: pass at least one field.");
        const updated = await v1.updateIssue(ws, projectId, issue.id, body);
        return v1.describeIssue(ws, { ...issue, ...updated, project: projectId });
      })
  );

  server.registerTool(
    "plane_list_states",
    {
      title: "Project states",
      description: "Valid states of a project, with their group (backlog, unstarted, started, completed, cancelled).",
      inputSchema: { slug, project },
      annotations: read,
    },
    async ({ slug: s, project: p }) =>
      run(async () => {
        const ws = slugOf(s);
        const found = await v1.resolveProject(ws, p);
        return (await v1.states(ws, found.id)).map((st) => ({ name: st.name, group: st.group, default: !!st.default }));
      })
  );

  server.registerTool(
    "plane_list_labels",
    {
      title: "Project labels",
      description: "Valid labels of a project.",
      inputSchema: { slug, project },
      annotations: read,
    },
    async ({ slug: s, project: p }) =>
      run(async () => {
        const ws = slugOf(s);
        const found = await v1.resolveProject(ws, p);
        return (await v1.labels(ws, found.id)).map((l) => l.name);
      })
  );

  server.registerTool(
    "plane_list_members",
    {
      title: "Project members",
      description: "Who can be assigned to tasks of the project: display name and email.",
      inputSchema: { slug, project },
      annotations: read,
    },
    async ({ slug: s, project: p }) =>
      run(async () => {
        const ws = slugOf(s);
        const found = await v1.resolveProject(ws, p);
        return (await v1.members(ws, found.id)).map((m) => ({ display_name: m.display_name, email: m.email }));
      })
  );
}
