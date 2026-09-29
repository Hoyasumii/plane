---
sidebar_position: 4
title: 工作项工具
description: "基于 API v2 的四个类型化工作项 MCP 工具，支持其过滤器、fields 和 expand。"
---

# 工作项工具

有四个类型化工具，通过 API v2 覆盖了工作项，包括 v2 的过滤器、`fields` 和 `expand`。它们位于
`src/mcp/tools/curated.ts` 中。其他一切都要通过[通用工具](./generic-tools.md)。

| 工具                     | 作用                                                          |
| ------------------------ | ------------------------------------------------------------- |
| `plane_list_work_items`  | 一个项目中的工作项；省略 `project` 时则是整个工作区中的工作项 |
| `plane_get_work_item`    | 一个工作项，按标识符（`ENG-123`）或者按 UUID 加 `project`     |
| `plane_create_work_item` | 在一个项目中创建一个工作项                                    |
| `plane_update_work_item` | 修改给出的那些字段，并且只发送那些字段                        |

除非配置了默认工作区，否则 `slug` 是必须的。`project` 是一个项目 UUID 或者它的标识符（`ENG`），
`workItem` 则是一个像 `ENG-123` 这样的标识符或者一个 UUID。用标识符的时候不需要项目：它会通过一次覆盖
整个工作区的查找来解析。

## `plane_list_work_items`

| 输入           | 含义                                                                    |
| -------------- | ----------------------------------------------------------------------- |
| `project?`     | 一个项目；省略时则是整个工作区                                          |
| `search?`      | 自由文本搜索                                                            |
| `state_id?`    | 一个状态                                                                |
| `state_group?` | `backlog`、`unstarted`、`started`、`completed`、`cancelled` 或 `triage` |
| `assignee_id?` | 一个经办人                                                              |
| `label_id?`    | 一个标签                                                                |
| `priority?`    | `none`、`low`、`medium`、`high` 或 `urgent`                             |
| `cycle_id?`    | 一个迭代周期                                                            |
| `module_id?`   | 一个模块                                                                |
| `order_by?`    | 一个排序方式，例如 `-updated_at`                                        |
| `fields?`      | 只返回这些字段，例如 `["name", "state_id"]`                             |
| `per_page?`    | 页面大小，1–100                                                         |
| `offset?`      | 要跳过的行数，用于下一页                                                |

对于这些输入没有覆盖到的过滤器，请对 `workspaces.projects.workItems` 的 `list` 运行 `plane_describe`。

## `plane_get_work_item`

`workItem`，再加上 `project`（只在 `workItem` 是 UUID 时需要）和 `expand`（要内联的相关对象，例如
`["state", "labels"]`）。

## `plane_create_work_item` 和 `plane_update_work_item`

两者都接受 `project`（创建时）或者 `workItem`（更新时），然后是工作项本身的字段。创建时 `name` 是必需
的。

| 字段                         | 含义                                        |
| ---------------------------- | ------------------------------------------- |
| `name`                       | 标题                                        |
| `description_html`           | 作为 HTML 的描述，例如 `<p>text</p>`        |
| `state` / `state_id`         | 一个状态名（`In Progress`）或者它的 id      |
| `priority`                   | `none`、`low`、`medium`、`high` 或 `urgent` |
| `assignees` / `assignee_ids` | 经办人的邮箱，或者他们的 id                 |
| `labels` / `label_ids`       | 标签名，或者它们的 id                       |
| `parent`                     | 父工作项的标识符或 id                       |
| `type`                       | 一个工作项类型名                            |
| `start_date` / `target_date` | `YYYY-MM-DD`；目标日期不能早于开始日期      |
| `estimate`                   | 一个估算值                                  |
| `cycle_id`                   | 一个迭代周期 id，或者 `null`                |

## 在没有 API v2 的实例上

在自托管的 Plane 1.4.x 上，这四个工具会用相同的输入通过 v1（`src/mcp/tools/work-items-v1.ts`）来回答。
只有 v2 能提供的那些参数（`cycle_id`、`module_id`、`order_by`、`fields`、`expand`、`type`、`estimate`）
会按名字失败，而不是被忽略。
