import { PlaneClient } from "../../client/plane-client";
import { AttachmentTooLargeError } from "../../errors/AttachmentTooLargeError";
import { HttpError } from "../../errors/HttpError";
import type { CreateWorkItem, UpdateWorkItem } from "../../models/WorkItem";
import type { PaginatedResponse } from "../../models/common";
import { TtlCache } from "./cache";
import { ToolInputError } from "../catalog";
import { Sleep, realSleep, withRateLimitRetry } from "./rate-limit";
import { UUID, htmlImages, htmlToText, markdownToHtml, parseIssueKey, sniffImage, textToHtml } from "./text";

export const PRIORITIES = ["urgent", "high", "medium", "low", "none"] as const;
export const STATE_GROUPS = ["backlog", "unstarted", "started", "completed", "cancelled"] as const;
export type StateGroup = (typeof STATE_GROUPS)[number];
/** The groups a task is still open in. */
export const OPEN_GROUPS: StateGroup[] = ["backlog", "unstarted", "started"];

/** The largest image `downloadIssueImage` accepts. */
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const PAGE_SIZE = 100;
const MAX_PAGES = 50;

/** A relation as v1 answers it: an id, or the object when expanded. */
type Ref = string | { id?: string } | null | undefined;

/** The fields of a v1 work item this layer reads. */
export interface V1Issue {
  id: string;
  name: string;
  sequence_id: number;
  project: Ref;
  state?: Ref;
  assignees?: Ref[];
  labels?: Ref[];
  priority?: string;
  start_date?: string | null;
  target_date?: string | null;
  created_at?: string;
  updated_at?: string;
  description_html?: string;
  description_stripped?: string;
}

export interface V1Project {
  id: string;
  identifier: string;
  name: string;
}
export interface V1State {
  id: string;
  name: string;
  group: string;
  default?: boolean;
}
export interface V1Label {
  id: string;
  name: string;
}
export interface V1Member {
  id: string;
  email?: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
}
export type V1User = V1Member;

/** A work item as the tools show it: names instead of ids. */
export interface IssueSummary {
  key: string;
  title: string;
  project: string;
  state: string | undefined;
  state_group: string | undefined;
  priority: string | undefined;
  assignees: string[];
  labels: string[];
  start_date: string | null;
  target_date: string | null;
  created_at: string | undefined;
  updated_at: string | undefined;
  url: string;
  description?: string;
  images?: ReturnType<typeof htmlImages>;
}

/** Fields a create or update sends; `null` clears a date. */
export interface IssueWrite {
  name?: string;
  description_html?: string;
  state?: string;
  priority?: string;
  assignees?: string[];
  labels?: string[];
  start_date?: string | null;
  target_date?: string | null;
}

export interface PlaneV1WorkspaceOptions {
  sleep?: Sleep;
  now?: () => number;
}

export const idOf = (value: Ref): string | undefined =>
  value && typeof value === "object" ? value.id : (value ?? undefined);
const norm = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toLowerCase();
const memberName = (member: V1Member): string => member.display_name || member.email || member.id;

/**
 * The v1 surface the MCP's typed tools stand on: readable in, readable out.
 *
 * Projects, states, labels, members and `me` are cached for five minutes; every call
 * waits out one 429. One instance serves the whole process, so the cache is shared by
 * every request.
 */
export class PlaneV1Workspace {
  private readonly cache: TtlCache;
  private readonly sleep: Sleep;

  constructor(
    private readonly client: PlaneClient,
    options: PlaneV1WorkspaceOptions = {}
  ) {
    this.cache = new TtlCache(undefined, options.now);
    this.sleep = options.sleep ?? realSleep;
  }

  get baseUrl(): string {
    return this.client.config.baseUrl.replace(/\/+$/, "");
  }

  private call<T>(work: () => Promise<T>): Promise<T> {
    return withRateLimitRetry(work, this.sleep);
  }

  /** Every row of a cursor-paginated list; a bare array is taken as is. */
  private async listAll<T>(page: (params: { per_page: number; cursor?: string }) => Promise<unknown>): Promise<T[]> {
    const rows: T[] = [];
    let cursor: string | undefined;
    for (let index = 0; index < MAX_PAGES; index++) {
      const data = (await this.call(() => page({ per_page: PAGE_SIZE, ...(cursor ? { cursor } : {}) }))) as
        | T[]
        | PaginatedResponse<T>;
      if (Array.isArray(data)) return data;
      rows.push(...(data?.results ?? []));
      if (!data?.next_page_results || !data.next_cursor) return rows;
      cursor = data.next_cursor;
    }
    return rows;
  }

  // ---------- Cached lookups ----------

  me(): Promise<V1User> {
    return this.cache.get("me", () => this.call(() => this.client.users.me() as Promise<V1User>));
  }

  projects(slug: string): Promise<V1Project[]> {
    return this.cache.get(`projects:${slug}`, () =>
      this.listAll<V1Project>((params) => this.client.projects.list(slug, params as never))
    );
  }

  states(slug: string, projectId: string): Promise<V1State[]> {
    return this.cache.get(`states:${slug}:${projectId}`, () =>
      this.listAll<V1State>((params) => this.client.states.list(slug, projectId, params as never))
    );
  }

  labels(slug: string, projectId: string): Promise<V1Label[]> {
    return this.cache.get(`labels:${slug}:${projectId}`, () =>
      this.listAll<V1Label>((params) => this.client.labels.list(slug, projectId, params as never))
    );
  }

  members(slug: string, projectId: string): Promise<V1Member[]> {
    return this.cache.get(`members:${slug}:${projectId}`, async () => {
      const raw = (await this.call(() => this.client.projects.getMembers(slug, projectId))) as unknown[];
      // Some versions answer the user itself, others wrap it as { member: {...} }.
      return (raw ?? []).map((row) => {
        const wrapped = (row as { member?: unknown })?.member;
        return (wrapped && typeof wrapped === "object" ? wrapped : row) as V1Member;
      });
    });
  }

  // ---------- Resolution by name ----------

  /** A project by identifier (`ACME`), name or id. */
  async resolveProject(slug: string, ref: string): Promise<V1Project> {
    const projects = await this.projects(slug);
    const wanted = norm(ref);
    const found = projects.find((p) => p.id === ref || norm(p.identifier) === wanted || norm(p.name) === wanted);
    if (!found) {
      const options = projects.map((p) => `${p.identifier} (${p.name})`).join(", ");
      throw new ToolInputError(`Project "${ref}" not found. Available: ${options || "none"}.`);
    }
    return found;
  }

  async resolveState(slug: string, projectId: string, ref: string): Promise<V1State> {
    const states = await this.states(slug, projectId);
    const found = states.find((s) => s.id === ref || norm(s.name) === norm(ref));
    if (!found) {
      const options = states.map((s) => `${s.name} [${s.group}]`).join(", ");
      throw new ToolInputError(`State "${ref}" does not exist in this project. Available: ${options}.`);
    }
    return found;
  }

  async resolveLabels(slug: string, projectId: string, refs: string[]): Promise<string[]> {
    const labels = await this.labels(slug, projectId);
    return refs.map((ref) => {
      const found = labels.find((l) => l.id === ref || norm(l.name) === norm(ref));
      if (!found) {
        const options = labels.map((l) => l.name).join(", ");
        throw new ToolInputError(`Label "${ref}" does not exist in this project. Available: ${options || "none"}.`);
      }
      return found.id;
    });
  }

  /** Members by `me`, email, display name, full name or id. */
  async resolveMembers(slug: string, projectId: string, refs: string[]): Promise<string[]> {
    if (refs.length === 0) return [];
    const [members, me] = await Promise.all([this.members(slug, projectId), this.me()]);
    return refs.map((ref) => {
      const wanted = norm(ref);
      if (wanted === "me") return me.id;
      const found = members.find(
        (m) =>
          m.id === ref ||
          norm(m.email) === wanted ||
          norm(m.display_name) === wanted ||
          norm(`${m.first_name ?? ""} ${m.last_name ?? ""}`) === wanted
      );
      if (!found) {
        const options = members.map(memberName).join(", ");
        throw new ToolInputError(`Member "${ref}" not found in the project. Available: ${options || "none"}.`);
      }
      return found.id;
    });
  }

  // ---------- Work items ----------

  async getIssueByKey(slug: string, key: string): Promise<V1Issue> {
    const { identifier, sequence } = parseIssueKey(key);
    try {
      return (await this.call(() =>
        this.client.workItems.retrieveByIdentifier(slug, `${identifier}-${sequence}`)
      )) as unknown as V1Issue;
    } catch (error) {
      if (error instanceof HttpError && error.statusCode === 404) {
        throw new ToolInputError(`Task ${identifier}-${sequence} not found in workspace '${slug}'.`);
      }
      throw error;
    }
  }

  async retrieveIssue(slug: string, projectId: string, id: string): Promise<V1Issue> {
    return (await this.call(() => this.client.workItems.retrieve(slug, projectId, id))) as unknown as V1Issue;
  }

  listProjectIssues(slug: string, projectId: string): Promise<V1Issue[]> {
    return this.listAll<V1Issue>((params) => this.client.workItems.list(slug, projectId, params));
  }

  async createIssue(slug: string, projectId: string, body: IssueWrite): Promise<V1Issue> {
    return (await this.call(() =>
      this.client.workItems.create(slug, projectId, body as unknown as CreateWorkItem)
    )) as unknown as V1Issue;
  }

  async updateIssue(slug: string, projectId: string, id: string, body: IssueWrite): Promise<V1Issue> {
    return (await this.call(() =>
      this.client.workItems.update(slug, projectId, id, body as unknown as UpdateWorkItem)
    )) as unknown as V1Issue;
  }

  listComments(slug: string, projectId: string, issueId: string) {
    return this.listAll<{
      id: string;
      actor?: Ref;
      created_by?: string;
      created_at?: string;
      comment_html?: string;
      comment_stripped?: string;
    }>((params) => this.client.workItems.comments.list(slug, projectId, issueId, params as never));
  }

  addComment(slug: string, projectId: string, issueId: string, text: string, format: "text" | "markdown" = "text") {
    const commentHtml = format === "markdown" ? markdownToHtml(text) : textToHtml(text);
    return this.call(() =>
      this.client.workItems.comments.create(slug, projectId, issueId, { comment_html: commentHtml })
    );
  }

  // ---------- Images ----------

  /**
   * An editor image (asset) of a work item: `{ buffer, ext, content_type }`.
   *
   * The documented download (`GET /workspaces/<ws>/assets/<id>/`) answers 500 on Plane
   * 1.4.2: it calls `S3Storage(is_server=True)`, which the constructor does not accept.
   * The attachment detail filters the asset by workspace and project only (and requires
   * project membership), so it serves description images too, as a redirect to a signed
   * URL — which `workItems.attachments.download` follows without the API key.
   */
  async downloadIssueImage(
    slug: string,
    projectId: string,
    issueId: string,
    assetId: string
  ): Promise<{ buffer: Buffer; ext: string; content_type: string }> {
    if (!UUID.test(String(assetId))) throw new ToolInputError(`Invalid asset id: "${assetId}".`);
    let file: { data: Buffer; contentType: string };
    try {
      file = await this.call(() =>
        this.client.workItems.attachments.download(slug, projectId, issueId, assetId, { maxBytes: MAX_IMAGE_BYTES })
      );
    } catch (error) {
      if (error instanceof AttachmentTooLargeError) {
        throw new ToolInputError(`Image ${assetId} is larger than ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`);
      }
      throw error;
    }
    const { data: buffer, contentType } = file;
    const ext =
      sniffImage(buffer) ?? (contentType.startsWith("image/") ? contentType.slice(6).replace("+xml", "") : null);
    if (!ext) throw new ToolInputError(`Asset ${assetId} is not an image (${contentType || "unknown type"}).`);
    return { buffer, ext, content_type: contentType };
  }

  // ---------- Readable output ----------

  async projectOf(slug: string, issue: V1Issue): Promise<V1Project> {
    const id = idOf(issue.project) ?? "";
    const projects = await this.projects(slug);
    return projects.find((p) => p.id === id) ?? { id, identifier: "?", name: "?" };
  }

  issueUrl(slug: string, project: { id: string }, issue: { id: string }): string {
    return `${this.baseUrl}/${slug}/projects/${project.id}/issues/${issue.id}`;
  }

  /** A work item with names instead of ids; the description as text, images as `[image n]`. */
  async describeIssue(
    slug: string,
    issue: V1Issue,
    { withDescription = true }: { withDescription?: boolean } = {}
  ): Promise<IssueSummary> {
    const project = await this.projectOf(slug, issue);
    const [states, labels, members] = await Promise.all([
      this.states(slug, project.id),
      this.labels(slug, project.id),
      this.members(slug, project.id),
    ]);
    const state = states.find((s) => s.id === idOf(issue.state));
    const nameOfMember = (id: string | undefined): string => {
      const found = members.find((m) => m.id === id);
      return found ? memberName(found) : String(id);
    };

    const out: IssueSummary = {
      key: `${project.identifier}-${issue.sequence_id}`,
      title: issue.name,
      project: project.name ?? project.identifier,
      state: state?.name ?? idOf(issue.state),
      state_group: state?.group,
      priority: issue.priority,
      assignees: (issue.assignees ?? []).map(idOf).map(nameOfMember),
      labels: (issue.labels ?? []).map(idOf).map((id) => labels.find((l) => l.id === id)?.name ?? String(id)),
      start_date: issue.start_date ?? null,
      target_date: issue.target_date ?? null,
      created_at: issue.created_at,
      updated_at: issue.updated_at,
      url: this.issueUrl(slug, project, issue),
    };
    if (withDescription) {
      // description_stripped drops images; with any, the text comes from the HTML with markers.
      const images = htmlImages(issue.description_html);
      out.description = images.length
        ? htmlToText(issue.description_html)
        : issue.description_stripped?.trim() || htmlToText(issue.description_html);
      if (images.length) out.images = images;
    }
    return out;
  }

  /** Work items matching every given filter. */
  async filterIssues(
    slug: string,
    issues: V1Issue[],
    filters: { stateGroups?: readonly string[]; query?: string; assigneeIds?: string[] }
  ): Promise<V1Issue[]> {
    const query = filters.query?.trim().toLowerCase();
    const out: V1Issue[] = [];
    for (const issue of issues) {
      const assignees = (issue.assignees ?? []).map(idOf);
      if (filters.assigneeIds && !filters.assigneeIds.every((id) => assignees.includes(id))) continue;
      if (query) {
        const haystack = `${issue.name} ${issue.description_stripped ?? htmlToText(issue.description_html)}`;
        if (!haystack.toLowerCase().includes(query)) continue;
      }
      if (filters.stateGroups) {
        const states = await this.states(slug, idOf(issue.project) ?? "");
        const group = states.find((s) => s.id === idOf(issue.state))?.group;
        if (!group || !filters.stateGroups.includes(group)) continue;
      }
      out.push(issue);
    }
    return out;
  }

  /** The most recently updated first, without descriptions, with `total` and `shown`. */
  async summarize(slug: string, issues: V1Issue[], limit: number) {
    const sorted = [...issues].sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
    const items: IssueSummary[] = [];
    for (const issue of sorted.slice(0, limit)) {
      items.push(await this.describeIssue(slug, issue, { withDescription: false }));
    }
    return { total: issues.length, shown: items.length, issues: items };
  }
}
