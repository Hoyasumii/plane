---
sidebar_position: 100
title: Contributing
---

# Contributing

The repository is [Hoyasumii/plane](https://github.com/Hoyasumii/plane), managed with pnpm (Node.js 20 or later).

```bash
pnpm install          # dependencies, plus the git hooks (husky)
pnpm build            # compile to dist/ and bundle dist/types.bundle.d.ts
pnpm dev              # tsc --watch
pnpm test:unit        # unit tests (no Plane instance needed)
pnpm check:lint       # oxlint (`pnpm fix:lint` fixes what it can)
pnpm check:format     # oxfmt, 120 columns (`pnpm fix:format` rewrites)
pnpm check:knip       # unused files, exports and dependencies
```

There is no CI: the checks run locally through git hooks. `pre-commit` runs `check:lint` and `check:format`,
`commit-msg` runs commitlint with the conventional config (`feat: …`, `fix(mcp): …`), and `pre-push` runs
`check:types`, `check:knip` and `test:unit`.

## Building from source

`pnpm build` runs `tsc` into `dist/`, bundles the type definitions into `dist/types.bundle.d.ts`, and compares
that bundle's exports with `scripts/__fixtures__/types-bundle-exports.snapshot.txt`. If you changed the public
exports on purpose, update the snapshot. For a clean rebuild:

```bash
pnpm clean            # deletes dist/ and node_modules/
pnpm install
pnpm build
```

After changing anything under `src/api/v2/`, run `pnpm codegen:mcp` to regenerate the method catalog the MCP
server reads (`src/mcp/generated/catalog.json`). `src/api/v2/generated/constants.ts` is produced by
`pnpm codegen:v2` from the api_v2 OpenAPI document: never edit either by hand.

To try the build locally, run `node dist/cli/index.js --help`, or link it with `npm link` and run
`plane --help`. `npm pack --dry-run` lists exactly what would be published.

## Tests

Tests live in `tests/unit/` and `tests/e2e/`. The unit tests need no Plane instance. The end-to-end tests need
a `.env.test` with real ids:

```bash
cp env.example .env.test
```

Then fill in `TEST_WORKSPACE_SLUG`, `TEST_PROJECT_ID`, `TEST_USER_ID`, `TEST_WORK_ITEM_ID`, `TEST_CUSTOMER_ID`
and the other ids the suites ask for.

```bash
pnpm test                                 # everything
pnpm test:unit                            # unit tests only
pnpm test:e2e                             # end-to-end tests only
pnpm test tests/unit/page.test.ts         # one file
```

Tests run one at a time, to stay under Plane's rate limit.

## How the v2 surface is kept honest

The v2 surface is 90 resource classes, and none of it is spot-checked. Rule sweeps run over **every** class,
enumerated from the TypeScript source, and each is proved by introducing the violation and watching the sweep
name it:

| Sweep                    | What it refuses                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| Call shape               | a method that does not open with its URL's path ids, in path order                               |
| `fields` / `expand`      | an operation that offers a projection the SDK does not expose                                    |
| Query filters            | a `?filter=` the API accepts and no params type declares                                         |
| `order_by`               | a missing sort order, or a params type pointed at a sibling's enum                               |
| Pagination               | an unreachable half of the paging envelope — including a `paginate` with no `cursor` to spend it |
| Operation correspondence | a method with no `operations` entry, silently exempt from the above                              |
| Projection soundness     | a method that accepts `fields` and answers the full row anyway                                   |
| Loader routing           | a row-returning method on a navigable class that skips `load()`                                  |
| Alternate paths          | a method that declares an `extraPaths` override and ignores it                                   |
| Lookups                  | a `findBy*` filtering on something the API does not filter on                                    |

Two more sweeps cover the tree rather than the classes: **band completeness** requires every resource to be
attached to the root its URL template names (and nothing foreign to be), and **navigation completeness**
requires a resource that attaches a child to answer navigable rows, with one property per child and no property
shadowing a real field. Every method also asserts its exact request URL against a mock server.

The documentation is checked too. `tests/unit/v2/readme-samples.test.ts` type-checks every TypeScript fence in
`README.md`, `CLAUDE.md`, `AGENTS.MD` and every page of this site, in both languages, against the SDK source. It
also checks the claims in prose that are facts about the repository: scripts that exist, paths that exist,
`v2.` names that are exported, and batch caps that match the kernel.

## This site

The site lives in `website/`, a workspace package built with Docusaurus. The guides are Markdown in
`website/docs/`, the pt-BR translation mirrors them in `website/i18n/pt-BR/`, and the API reference is generated
from `src/` by TypeDoc on every build.

```bash
pnpm docs:dev                        # live preview, in English
pnpm docs:dev --locale pt-BR         # live preview, in Portuguese
pnpm docs:build                      # both languages, into website/build/
GIT_USER=<github-user> pnpm docs:deploy   # build and push to the gh-pages branch
```
