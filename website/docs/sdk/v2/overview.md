---
sidebar_position: 1
title: API v2 overview
---

# API v2 overview

`client.v2` reaches the v2 surface: 90 resource classes, generated against Plane's api_v2 OpenAPI document.
The v1 resources on the client are unchanged (see [API v1](../v1.md)).

There are **two ways in**, and they are the same resources either way:

1. **The flat path.** Every resource is an attribute, and every id is an argument.
2. **Loaded rows.** A fetched row is where its children live. See [Loaded rows](./loaded-rows.md).

## The flat path

A resource hangs off the namespace at the position its URL puts it, and takes the ids its URL names as
**leading positional arguments**, in path order:

```ts
import { PlaneClient } from "@hoyasumii/plane";

const client = new PlaneClient({ baseUrl: "https://api.plane.so", apiKey: "..." });

// GET /workspaces/acme/projects/ENG/states/
await client.v2.workspaces.projects.states.list("acme", "ENG");

// GET /workspaces/acme/projects/ENG/work-items/wi-1/comments/
await client.v2.workspaces.projects.workItems.comments.list("acme", "ENG", "wi-1");

// GET /workspaces/acme/teamspaces/
await client.v2.workspaces.teamspaces.list("acme");
```

`v2.workspaces` and `v2.workspaces.projects` are the two roots. Every resource sits at exactly one attribute
path, the one its URL names: a workspace-level resource under `v2.workspaces`, a project-level one under
`v2.workspaces.projects`.

`project` accepts a project's UUID **or** its readable identifier (`"ENG"`). A work item can be reached by its
human key with `retrieveByIdentifier`. No v2 method takes a `workspaceSlug` or `project` option object: path
ids are positional and always first, in URL order, and everything else lives in the trailing `params` object.

```ts
// ENG-123, without knowing its project first.
const item = await client.v2.workspaces.workItems.retrieveByIdentifier("acme", "ENG-123");
console.log(item.name);
```

## The standard methods

Most resources expose some of the same verbs, each with its path ids first:

| Method                                     | What it does                                                            |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| `list(...ids, params?)`                    | one page of rows ([Pagination](./pagination.md))                        |
| `iterate(...ids, params?)`                 | an async iterator that follows the pages for you                        |
| `retrieve(...ids, id, params?)`            | one row                                                                 |
| `create(...ids, data, params?)`            | a new row                                                               |
| `update(...ids, id, data, params?)`        | a partial update                                                        |
| `upsert(...ids, data, params?)`            | create, or update the row with the same `external_source`/`external_id` |
| `delete(...ids, id)`                       | removes the row                                                         |
| `archive` / `unarchive`                    | on projects and work items                                              |
| `bulkCreate` / `bulkUpdate` / `bulkDelete` | batches ([Memberships and bulk writes](./memberships-and-bulk.md))      |
| `findByName` and other `findBy*`           | exactly one row by a human key ([Lookups](./lookups.md))                |

Reads and writes that accept `fields` narrow their return type to the fields you asked for
([Field projection](./field-projection.md)). `expand` inlines related objects, and `order_by` is checked
against the operation's own sort orders.

## Generated data

`v2.FIELDS`, `v2.EXPAND` and `v2.ORDER_BY` are the full operation-id → allowed-values maps the encoders
validate against (for example, `v2.FIELDS["states_list"]` lists every field `states.list` accepts).
`v2.OPENAPI_VERSION` is the api_v2 document version the SDK was generated from. All of them, plus the two caps
`v2.BULK_MAX_ITEMS` and `v2.BRIDGE_MAX_IDS`, are exported so you can enumerate valid values instead of guessing.

```ts
import { v2 } from "@hoyasumii/plane";

console.log(v2.OPENAPI_VERSION, v2.FIELDS["states_list"]);
```
