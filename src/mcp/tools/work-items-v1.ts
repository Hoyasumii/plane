import { ToolInputError } from "../catalog";
import { UUID, htmlToText } from "../v1/text";
import { IssueWrite, PlaneV1Workspace, V1Issue, idOf } from "../v1/workspace";

/**
 * The `*_work_item` tools on an instance without `/api/v2`: the same inputs, answered
 * through v1. What only v2 can do (cycle/module filters, `fields`, `expand`, types,
 * estimates) is refused by name rather than silently dropped.
 */

const IDENTIFIER = /^[A-Za-z0-9]+-\d+$/;

function refuse(given: Record<string, unknown>, names: string[]): void {
  const used = names.filter((name) => given[name] !== undefined);
  if (used.length > 0) {
    throw new ToolInputError(
      `${used.join(", ")} ${used.length === 1 ? "requires" : "require"} Plane API v2, which this instance does ` +
        "not serve (/api/v2 answers 404). Leave it out, or use plane_get_issue / plane_search_issues."
    );
  }
}

/** The work item behind an identifier (`ENG-7`) or a UUID plus its project. */
export async function v1WorkItem(
  v1: PlaneV1Workspace,
  slug: string,
  reference: string,
  project?: string
): Promise<V1Issue> {
  if (IDENTIFIER.test(reference)) return v1.getIssueByKey(slug, reference);
  if (!project) throw new ToolInputError(`'${reference}' is not an identifier like ENG-123; pass its project too.`);
  return v1.retrieveIssue(slug, (await v1.resolveProject(slug, project)).id, reference);
}

export interface V1ListParams {
  project?: string;
  search?: string;
  state_id?: string;
  state_group?: string;
  assignee_id?: string;
  label_id?: string;
  priority?: string;
  cycle_id?: string;
  module_id?: string;
  order_by?: string;
  fields?: string[];
  per_page?: number;
  offset?: number;
}

export async function listWorkItemsV1(v1: PlaneV1Workspace, slug: string, params: V1ListParams) {
  refuse(params as Record<string, unknown>, ["cycle_id", "module_id", "order_by", "fields"]);
  const projects = params.project ? [await v1.resolveProject(slug, params.project)] : await v1.projects(slug);
  const all: V1Issue[] = [];
  for (const project of projects) all.push(...(await v1.listProjectIssues(slug, project.id)));

  const query = params.search?.trim().toLowerCase();
  const matching: V1Issue[] = [];
  for (const issue of all) {
    if (params.state_id && idOf(issue.state) !== params.state_id) continue;
    if (params.priority && issue.priority !== params.priority) continue;
    if (params.assignee_id && !(issue.assignees ?? []).map(idOf).includes(params.assignee_id)) continue;
    if (params.label_id && !(issue.labels ?? []).map(idOf).includes(params.label_id)) continue;
    if (
      query &&
      !`${issue.name} ${issue.description_stripped ?? htmlToText(issue.description_html)}`.toLowerCase().includes(query)
    ) {
      continue;
    }
    matching.push(issue);
  }
  const filtered = params.state_group
    ? await v1.filterIssues(slug, matching, { stateGroups: [params.state_group] })
    : matching;

  const sorted = filtered.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
  const offset = params.offset ?? 0;
  const page = sorted.slice(offset, offset + (params.per_page ?? 50));
  const items = [];
  for (const issue of page) {
    items.push({ id: issue.id, ...(await v1.describeIssue(slug, issue, { withDescription: false })) });
  }
  return { api: "v1", total: filtered.length, offset, count: items.length, items };
}

export interface V1WorkItemData {
  name?: string;
  description_html?: string;
  state?: string;
  state_id?: string;
  priority?: string;
  assignees?: string[];
  assignee_ids?: string[];
  labels?: string[];
  label_ids?: string[];
  parent?: string;
  type?: string;
  start_date?: string;
  target_date?: string;
  estimate?: string;
  cycle_id?: string | null;
}

/** The v1 body for a create/update, with names resolved to ids. */
export async function workItemBodyV1(
  v1: PlaneV1Workspace,
  slug: string,
  projectId: string,
  data: V1WorkItemData
): Promise<IssueWrite & { parent?: string }> {
  const body: IssueWrite & { parent?: string } = {};
  if (data.name !== undefined) body.name = data.name;
  if (data.description_html !== undefined) body.description_html = data.description_html;
  const state = data.state_id ?? data.state;
  if (state !== undefined) body.state = (await v1.resolveState(slug, projectId, state)).id;
  if (data.priority !== undefined) body.priority = data.priority;
  if (data.assignees !== undefined || data.assignee_ids !== undefined) {
    body.assignees = await v1.resolveMembers(slug, projectId, [
      ...(data.assignees ?? []),
      ...(data.assignee_ids ?? []),
    ]);
  }
  if (data.labels !== undefined || data.label_ids !== undefined) {
    body.labels = await v1.resolveLabels(slug, projectId, [...(data.labels ?? []), ...(data.label_ids ?? [])]);
  }
  if (data.parent !== undefined) {
    body.parent = UUID.test(data.parent) ? data.parent : (await v1.getIssueByKey(slug, data.parent)).id;
  }
  if (data.start_date !== undefined) body.start_date = data.start_date;
  if (data.target_date !== undefined) body.target_date = data.target_date;
  return body;
}

const V2_ONLY_WRITE_FIELDS = ["type", "estimate", "cycle_id"];

export async function createWorkItemV1(v1: PlaneV1Workspace, slug: string, project: string, data: V1WorkItemData) {
  refuse(data as Record<string, unknown>, V2_ONLY_WRITE_FIELDS);
  const { id } = await v1.resolveProject(slug, project);
  return v1.createIssue(slug, id, await workItemBodyV1(v1, slug, id, data));
}

export async function updateWorkItemV1(
  v1: PlaneV1Workspace,
  slug: string,
  reference: string,
  project: string | undefined,
  data: V1WorkItemData
) {
  refuse(data as Record<string, unknown>, V2_ONLY_WRITE_FIELDS);
  const issue = await v1WorkItem(v1, slug, reference, project);
  const projectId = idOf(issue.project) ?? "";
  return v1.updateIssue(slug, projectId, issue.id, await workItemBodyV1(v1, slug, projectId, data));
}
