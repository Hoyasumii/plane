# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is `@hoyasumii/plane` — a TypeScript SDK for the Plane API. It uses axios for HTTP, targets Node.js >=20, and is managed with pnpm (see `packageManager` in `package.json`).

## Common Commands

```bash
pnpm install              # Install dependencies
pnpm build                # Compile TS + bundle type definitions
pnpm dev                  # Watch mode for development
pnpm test                 # Run all tests (Jest)
pnpm test:unit            # Unit tests only
pnpm test:e2e             # E2E tests only
pnpm test tests/unit/cycle.test.ts  # Run a single test file (no `--`: it reaches jest literally)
pnpm test:coverage        # Run with coverage report
pnpm check:lint           # Lint check (oxlint)
pnpm fix:lint             # Auto-fix lint issues
pnpm check:format         # Format check (oxfmt, 120 char width)
pnpm fix:format           # Auto-format
pnpm check:knip           # Unused files, exports and dependencies (knip, config in knip.json)
pnpm codegen:v2 <golden>  # Regenerate src/api/v2/generated/constants.ts from the api_v2 OpenAPI golden
pnpm check:types-bundle   # Compare dist/types.bundle.d.ts's export surface against the snapshot
pnpm codegen:mcp          # Regenerate src/mcp/generated/catalog.json from the v2 source (after any v2 change)
pnpm docs:dev             # Preview the docs site (append `--locale pt-BR` for Portuguese)
pnpm docs:build           # Build the docs site, both languages, into website/build/
GIT_USER=<user> pnpm docs:deploy  # Build and push the site to the gh-pages branch (GitHub Pages)
```

## Git Hooks

There is no CI: the checks run locally through husky (`.husky/`). `pre-commit` runs
`check:lint` and `check:format`; `commit-msg` runs commitlint with
`@commitlint/config-conventional` (`feat: …`, `fix(mcp): …`); `pre-push` runs
`check:types`, `check:knip` and `test:unit`. `pnpm install` installs the hooks through `prepare`.

## Testing

Tests live in `tests/unit/` and `tests/e2e/`. Tests require a `.env.test` file (copy from `env.example`) with real workspace/project IDs. Tests run sequentially (`maxWorkers: 1`) to avoid API rate limits. Jest uses `tsconfig.jest.json` via ts-jest.

## Architecture

**Entry point**: `src/index.ts` re-exports everything. The main consumer-facing class is `PlaneClient` (`src/client/plane-client.ts`), which instantiates all API resources with shared `Configuration`.

**BaseResource pattern** (`src/api/BaseResource.ts`): Abstract base class providing HTTP methods (get, post, patch, put, httpDelete) via axios. All API resource classes extend it. Handles both `apiKey` (X-Api-Key header) and `accessToken` (Bearer token) auth. Includes optional request/response logging with sensitive data sanitization.

**API resources** (`src/api/`): Each resource class extends BaseResource. Some have sub-resources as separate classes composed by the parent:

- `WorkItems/` → Comments, Attachments, Activities, Relations, WorkLogs
- `Customers/` → Properties, Requests
- `Teamspaces/` → Members, Projects
- `Initiatives/` → Labels, Projects, Epics
- `AgentRuns/` → Activities
- `WorkItemProperties/` → Options, Values

**API v2** (`src/api/v2/`): the v2 surface, reached as `client.v2`. Two public shapes,
and they are the same objects:

- **Flat.** A resource is a plain attribute at the position its URL puts it
  (`v2.workspaces.projects.states`, `v2.workspaces.teamspaces`, `v2.workspaces.projects.workItems.comments`)
  and takes the ids its URL names as **leading positional parameters, in path order**:
  `states.list(slug, project, params?)`. No public v2 method takes a `workspaceSlug`
  or `project` _option_ — path ids are positional and first; leaf ids
  (`workItemId`, `releaseId`, …) are just the last of them.
- **Loaded rows.** Every row-returning method routes through `LoadsNavigableRows`
  (`kernel/loaded.ts`) and answers a `Loaded<Row, Navigation>`: the row's data, one
  non-enumerable navigation property per attached child, and `$loaded`
  (`ids`/`idNames`/`present`). A navigation property is an `Owned<Child, Ids>` view —
  the same methods with the bound ids dropped from the front. `owned()` refuses to
  prepend ids into leading parameters that are named differently, and `loadRow`
  refuses to define a navigation property over a field the response carries (rename it
  and record the rename, as `Estimate.points` → `estimatePoints` and
  `WorkItemProperty.options` → `propertyOptions` did).

`v2.workspaces` and `v2.workspaces.projects` are the two band roots, and every resource
sits at exactly one attribute path — the one its URL names. The bound `Workspace`/
`Project` locator chain is **deleted**, and so is `V2Resource`'s `scope` constructor
argument that fed it: path ids reach the kernel only as leading positional parameters.
`Wiki.ts` and `GroupSync/` are grouping nodes: they consume no path id of their own, so
they are never navigation properties on a row.

`kernel/` holds the shared machinery (transport, pagination, generic `V2Resource`,
bulk helpers, `loaded.ts`); `generated/constants.ts` is produced by `pnpm codegen:v2`
from the api_v2 OpenAPI golden and must never be hand-edited. Resources are thin
declarations over `V2Resource` — a `path` template, an `operations` map from method
name to golden operation id, optional `extraPaths` for a method whose URL is not the
collection (`markDefault`, `regenerateWebhookSecret`, …). `urlFor` resolves path
placeholders from `{...scope, ...pathParams}`, explicit `pathParams` winning.

Membership bridges (`{add}`/`{remove}` POSTs answering `{added}`/`{removed}`) are never
`manage*` methods: they are `add(...pathIds, parentId, ids)` / `remove(...)` on a
sub-resource named for the noun (`cycles.workItems`, `initiatives.projects`,
`releases.labels`, `wiki.collections.members`), each built on
`V2Resource.doBridge`/`doBridgeAt`, which sends one verb per call, enforces
1..`BRIDGE_MAX_IDS` (100) ids client-side and resolves to the plain id array. That is a
different cap from `BULK_MAX_ITEMS` (50), which `checkCap` applies to `bulkCreate`/
`bulkUpdate`/`bulkDelete`: the golden sets `maxItems: 100` on the 24 bridge schemas and
`maxItems: 50` on the 21 bulk ones. A bridge verb copies the web app CTA —
properties on a work item type are `link`/`unlink`.

**`fields` narrows the return type.** Any method that accepts `fields` declares a
narrowing overload returning `Pick<Row, F | "id">` (or `LoadedXRow<Pick<Row, F | "id">>`,
or `Pick<Row, F | "id">[]`), then a general overload, then the implementation. This
holds for reads _and_ writes — `create`/`update`/`upsert` project too — and
`field-projection.test.ts` enforces it for every method, with no exception list: a
method that cannot narrow must not advertise `fields` (`Webhooks.regenerate` is the
precedent; its `fields` could have projected away the only copy of a secret). The one
place the narrowing does not survive is a _navigated_ call: TypeScript erases the type
parameter through `Owned`'s conditional, so `project.states.list({ fields })` answers
the full row. That is documented on `Owned`, on the docs site
(`website/docs/sdk/v2/field-projection.md`), and pinned in `navigation-types.test.ts` — and
it is why the flat form stays public.

Models live in `src/models/v2/`; read models mark every field except `id` optional,
because `?fields=` and collection deferral can omit any of them. The wiki page model is
`Page` (`src/models/v2/Page.ts`) — files that also need the pagination envelope
`Page<T>` (`models/v2/common.ts`) import it under a local `WikiPage` alias to keep both
in scope.

**The sweeps.** The v2 rules are enforced by enumeration, not by review.
`tests/unit/v2/tree-walk.ts` derives every resource class from the TypeScript AST under
`src/api/v2/` (triangulated against the modules and the public barrel), and the rule
sweeps run over all 90 of them:

| File                                                  | Refuses                                                                                                                                                                                           |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `path-id-naming.test.ts`                              | a method that does not open with its URL's path ids, in path order; also compares entries against the constructed tree in both directions                                                         |
| `fields-coverage.test.ts` / `expand-coverage.test.ts` | an operation whose golden `FIELDS`/`EXPAND` entry the SDK does not expose                                                                                                                         |
| `filters-coverage.test.ts`                            | a query filter the API accepts and no params type declares                                                                                                                                        |
| `order-by-coverage.test.ts`                           | a missing sort order, or a params type pointed at a sibling operation's enum                                                                                                                      |
| `pagination-coverage.test.ts`                         | an unreachable half of the paging envelope: a missing `offset`/`per_page`/`paginate`/`count`, a `paginate` with no `cursor` to spend, or an `iterate` still accepting the knobs its own loop sets |
| `operations-coverage.test.ts`                         | a method with no `operations` entry — which would silently exempt it from all of the above                                                                                                        |
| `field-projection.test.ts`                            | a method that accepts `fields` and answers the full row; also, JSDoc on the narrowing overload alone                                                                                              |
| `loader-routing.test.ts`                              | a row-returning method on a navigable class that never reaches `load`/`loadPage`/`loadIterate`, or declares the bare read model as its return type                                                |
| `extra-paths.test.ts`                                 | a method that declares an `extraPaths` override and then builds its URL from `path` anyway                                                                                                        |
| `lookup-coverage.test.ts`                             | a `findBy*` that filters on something the golden does not declare, a client-side walk where the server can filter, or a missing lookup where it can                                               |

Two more cover the tree: `bands.test.ts` derives each band from the resources' own URL
templates and requires every member to be attached to its root (and nothing foreign to
be), and `loaded-navigation.test.ts` requires a resource that attaches a migrated child
to be navigable, with one property per child, no property shadowing a field, no grandchild
reachable through an owned view, and the narrowing caveat documented on every navigation
property. `readme-samples.test.ts` type-checks every TypeScript fence in `README.md`,
`CLAUDE.md`, `AGENTS.MD` and every hand-written page of the docs site in both languages,
and checks the prose claims that are facts about this repo (scripts that exist, paths
that exist, caps that match the kernel, and the package's real name). It also requires the
pt-BR site to carry the same pages as the English one.

Every exception list in those files is guarded from both ends (an entry naming
something that does not exist fails; an entry that is no longer needed fails) and
ratcheted, so it can only shrink. **When you change a sweep, prove it:** introduce the
violation, watch it fail by name, revert. A sweep that has passed but has never been
shown to fail is not evidence.

**MCP server** (`src/mcp/`, published as the `@hoyasumii/plane/mcp` subpath through
`exports` in `package.json`): `servePlaneMcpStdio({ baseUrl, apiKey })` (`src/mcp/stdio.ts`) serves
`buildPlaneMcpServer(client)` over stdio, and `startPlaneMcpServer({ port, baseUrl, apiKey })` over
stateless Streamable HTTP on `127.0.0.1`. `src/mcp/cli.ts` is the `plane-mcp` bin: stdio by default,
HTTP with `--http` (`plane mcp start` runs the HTTP server, not the bin). In stdio mode stdout is the
protocol channel — log to stderr only. The task tools (`plane_get_issue`, `plane_update_issue`,
`plane_add_comment`, `plane_get_issue_images`, …) live in `src/mcp/tools/kit.ts`. They take tasks by key and
everything else by name, and they always go through v1, via `PlaneV1Workspace` (`src/mcp/v1/workspace.ts`):
a five-minute cache, one `Retry-After` wait on a 429 (which needs `HttpError.headers`), name resolution and
readable output. Images come through `workItems.attachments.download`. The v2 `*_work_item` tools live in `src/mcp/tools/curated.ts`. On an instance with no
`/api/v2` (self-hosted 1.4.x), which `ApiVersionProbe` (`src/mcp/v1/api-version.ts`) detects once through
`client.v2.users.me()`, they
answer through v1 (`tools/work-items-v1.ts`) and `plane_resources`/`plane_call` refuse. The three generic tools
(`plane_resources`/`plane_describe`/`plane_call`) live in `src/mcp/tools/generic.ts`. `startPlaneMcpServer`
makes one `PlaneMcpRuntime` (`src/mcp/runtime.ts`) per process, so the cache and the probe outlive each
stateless POST. It also refuses a non-loopback `Host` and serves `GET /health`. The generic tools read
`src/mcp/generated/catalog.json`, which `scripts/build-mcp-catalog.ts` derives through
`tests/unit/v2/tree-walk.ts`: resource paths, parameter names in call order, and the golden's
allowed values. Never hand-edit the catalog. `tests/unit/mcp/catalog.test.ts` regenerates it
and fails when it is stale, so run `pnpm codegen:mcp` after touching `src/api/v2/`. `invoke`
(`src/mcp/invoke.ts`) only reaches catalog methods, orders named args by the declared
parameter names, and refuses `destructive` methods without `confirm: true`.

**CLI** (`src/cli/`, the `plane` bin): an MCP _client_ built on citty (pinned to 0.1.x — 0.2 is
ESM-only and this build is CommonJS). `connectPlaneMcp` (`src/cli/connect.ts`) connects over
Streamable HTTP when given `--url`/`PLANE_MCP_URL`, otherwise to `buildPlaneMcpServer` in-process
through `InMemoryTransport`. `runCli` (`src/cli/run.ts`) turns each tool from `listTools()` into a
subcommand, and `src/cli/schema-args.ts` maps its JSON Schema to flags and coerces the values back.
`plane mcp start|stop|status|boot|config|install|uninstall` (`src/cli/mcp/`) is intercepted before any connection:
it runs the server detached (`start --foreground` in a child, pid/log under `<config dir>/run/`),
installs a per-user login service (systemd user unit / LaunchAgent / logon task), and writes the saved
`.env`: `config` asks in the terminal (`config-prompt.ts`, over `textInput` in `picker.ts`), takes flags
without asking, or serves a local Tailwind form with `--web`; all three validate through `valuesFromInput`
(`config-ui.ts`). `install` (`install.ts`, with the raw-mode checkbox picker in `picker.ts`) registers `plane-mcp` (stdio) in Claude Code, Codex and OpenCode through each client's own CLI;
`uninstall` removes it (OpenCode has no `mcp remove`, so `removeJsoncProperty` edits its config, keeping comments).
They iterate over _hosts_ × clients (`src/cli/mcp/hosts.ts`): `native` always, and `windows` inside
WSL, reached through `powershell.exe -EncodedCommand` (UTF-8 output, the user's registry `Path`)
and `wslpath`. `McpDeps.exec`/`spawn` go through `cross-spawn`, so Windows `.cmd` shims run. `plane mcp stop`
tries `POST /shutdown` with the token from the daemon state file before signalling.
Every OS call goes through `McpDeps`
(`src/cli/mcp/deps.ts`) so tests can stand in for it. Settings resolve flag > env > saved `.env` >
default in `resolveMcpConfig` (`src/mcp/config.ts`); a configured `PLANE_WORKSPACE` makes `slug`
optional on every tool. Every command but `plane mcp config`, `plane mcp uninstall` and usage output first passes `requireSavedConfig`
(`src/cli/mcp/index.ts`): with no saved `PLANE_API_KEY` it refuses, whatever flags, environment or
`--url` say.

**Models** (`src/models/`): TypeScript interfaces for each entity with separate Create/Update DTOs. Uses `Pick`, `Omit`, and `Partial` for DTO derivation. Notable: `WorkItem` uses a generic expandable fields pattern (`WorkItem<E extends WorkItemExpandableFieldName = never>`).

**Errors** (`src/errors/`): `PlaneError` is the base of everything. v1 raises
`HttpError` (status code and response data), plus `AttachmentTooLargeError` when
`workItems.attachments.download` passes its `maxBytes`. v2 raises `PlaneApiError` (an RFC 9457
problem detail), `NoMatchFoundError`/`MultipleMatchesFoundError` from the `findBy*`
lookups, `PlaneNetworkError` for a request that never reached a server, and
`MissingPathIdError` when a URL cannot be built. All seven extend `PlaneError`
directly — the lookup errors are _not_ subclasses of `PlaneApiError`, so catching that
alone does not catch them.

**Docs site** (`website/`, a workspace package): Docusaurus, published to GitHub
Pages at `https://hoyasumii.github.io/plane/` by `pnpm docs:deploy` — not by pnpm's built-in
`deploy` command, which does something else entirely. The guides are plain Markdown (`markdown.format: "md"`, not MDX) in
`website/docs/`, mirrored page for page in pt-BR under
`website/i18n/pt-BR/docusaurus-plugin-content-docs/current/`; change both together.
`website/docs/api/` is generated from `src/index.ts` and `src/mcp/index.ts` by
docusaurus-plugin-typedoc on every build and is gitignored. The README is only the
package's front page: the documentation lives on the site.

**OAuth**: Standalone `OAuthClient` (`src/client/oauth-client.ts`) handles authorization flows, token exchange, and refresh separately from the main SDK auth.

## Conventions

- All API endpoint URLs must end with `/`
- Standard resource methods: `list`, `iterate`, `retrieve`, `create`, `update`, `upsert`, `delete`
  (v1's older classes spell the last one `del`; v2 uses `delete` — follow the code)
- Never use "Issue" in names — always use "Work Item"
- File naming: kebab-case for files, PascalCase for classes, camelCase for methods
- Avoid `any` types; use proper typing or `unknown` with type guards
- Build produces `dist/` with compiled JS, declarations, source maps, and a bundled `types.bundle.d.ts`
