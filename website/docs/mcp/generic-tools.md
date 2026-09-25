---
sidebar_position: 5
title: Generic tools
---

# Generic tools

Three tools reach every v2 method the SDK has, across all 90 resources: cycles, modules, pages, releases,
initiatives, customers, webhooks, and the rest. They live in `src/mcp/tools/generic.ts`.

1. **`plane_resources`** finds a resource. Without a `query`, it lists every resource path with its method
   names. With one (`"cycle work items"`, `"webhook"`), it shows the matching resources with their method
   signatures.
2. **`plane_describe`** takes a `resource` and a `method` and shows the full signature: the parameters in call
   order (with the write-body fields), which of them are path ids, the allowed `fields`/`expand`/`order_by`/
   filter values, and an example `plane_call` input.
3. **`plane_call`** runs the method, with its arguments by parameter name.

A typical exchange, as the agent sees it:

```json
{ "tool": "plane_resources", "arguments": { "query": "cycle" } }
{ "tool": "plane_describe", "arguments": { "resource": "workspaces.projects.cycles", "method": "list" } }
{
  "tool": "plane_call",
  "arguments": {
    "resource": "workspaces.projects.cycles",
    "method": "list",
    "args": { "slug": "acme", "project": "ENG", "params": { "per_page": 20 } }
  }
}
```

## `plane_call`

| Input      | Meaning                                                                                              |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| `resource` | the dotted resource path, e.g. `workspaces.projects.states`                                          |
| `method`   | the method name, e.g. `list`, `create`, `add`                                                        |
| `args`     | arguments by parameter name: path ids first (`slug`, `project`, …), then the `data`/`params` objects |
| `limit`    | for `iterate` methods: how many items to collect (default 100, at most 1000)                         |
| `confirm`  | must be `true` to run a destructive method                                                           |

`slug` defaults to the configured workspace. List `params` accept `fields`, filters, `order_by`, `per_page` and
`offset`. A result longer than 60,000 characters is cut, with a note saying so.

**Destructive methods** (`delete`, `bulkDelete`, `remove`, `unlink`) refuse to run without `confirm: true`. The
tool description tells the agent to ask the user first.

## The catalog

The generic tools read `src/mcp/generated/catalog.json`: resource paths, parameter names in call order, and
the allowed values from the api_v2 OpenAPI document. It is generated from the SDK source by
`pnpm codegen:mcp`, and never edited by hand.

`plane_call` only reaches methods in the catalog, and orders the named arguments by the parameter names it
declares. On an instance without API v2, `plane_resources` and `plane_call` refuse with a message that points to
the typed tools; `plane_describe` keeps working, since it reads only the catalog.
