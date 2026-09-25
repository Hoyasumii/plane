---
sidebar_position: 4
title: Work item tools
---

# Work item tools

Four typed tools cover work items over API v2, with v2's filters, `fields` and `expand`. They live in
`src/mcp/tools/curated.ts`. Everything else goes through the [generic tools](./generic-tools.md).

| Tool                     | What it does                                                                 |
| ------------------------ | ---------------------------------------------------------------------------- |
| `plane_list_work_items`  | work items in one project, or across the workspace when `project` is omitted |
| `plane_get_work_item`    | one work item, by identifier (`ENG-123`) or by UUID plus `project`           |
| `plane_create_work_item` | creates a work item in a project                                             |
| `plane_update_work_item` | changes the fields given, and sends only those                               |

`slug` is required unless a default workspace is configured. `project` is a project UUID or its identifier
(`ENG`), and `workItem` an identifier like `ENG-123` or a UUID. With an identifier, no project is needed: it is
resolved through the workspace-wide lookup.

## `plane_list_work_items`

| Input          | Meaning                                                                 |
| -------------- | ----------------------------------------------------------------------- |
| `project?`     | one project; omitted, the whole workspace                               |
| `search?`      | free-text search                                                        |
| `state_id?`    | one state                                                               |
| `state_group?` | `backlog`, `unstarted`, `started`, `completed`, `cancelled` or `triage` |
| `assignee_id?` | one assignee                                                            |
| `label_id?`    | one label                                                               |
| `priority?`    | `none`, `low`, `medium`, `high` or `urgent`                             |
| `cycle_id?`    | one cycle                                                               |
| `module_id?`   | one module                                                              |
| `order_by?`    | a sort order, e.g. `-updated_at`                                        |
| `fields?`      | only these fields, e.g. `["name", "state_id"]`                          |
| `per_page?`    | page size, 1–100                                                        |
| `offset?`      | rows to skip, for the next page                                         |

For the filters these inputs do not cover, run `plane_describe` on `workspaces.projects.workItems` `list`.

## `plane_get_work_item`

`workItem`, plus `project` (only when `workItem` is a UUID) and `expand` (related objects to inline, e.g.
`["state", "labels"]`).

## `plane_create_work_item` and `plane_update_work_item`

Both take `project` (create) or `workItem` (update), then the work item fields. `name` is required on create.

| Field                        | Meaning                                                         |
| ---------------------------- | --------------------------------------------------------------- |
| `name`                       | the title                                                       |
| `description_html`           | the description as HTML, e.g. `<p>text</p>`                     |
| `state` / `state_id`         | a state name (`In Progress`) or its id                          |
| `priority`                   | `none`, `low`, `medium`, `high` or `urgent`                     |
| `assignees` / `assignee_ids` | assignee emails, or their ids                                   |
| `labels` / `label_ids`       | label names, or their ids                                       |
| `parent`                     | the parent work item's identifier or id                         |
| `type`                       | a work item type name                                           |
| `start_date` / `target_date` | `YYYY-MM-DD`; the target date cannot come before the start date |
| `estimate`                   | an estimate value                                               |
| `cycle_id`                   | a cycle id, or `null`                                           |

## On an instance without API v2

On self-hosted Plane 1.4.x these four tools answer through v1 (`src/mcp/tools/work-items-v1.ts`) with the
same inputs. The parameters only v2 can serve (`cycle_id`, `module_id`, `order_by`, `fields`, `expand`, `type`,
`estimate`) fail by name instead of being ignored.
