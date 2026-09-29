---
sidebar_position: 4
title: 工作項目工具
description: "基於 API v2 的四個型別化工作項目 MCP 工具，支援其篩選條件、fields 與 expand。"
---

# 工作項目工具

有四個型別化工具，透過 API v2 覆蓋了工作項目，包括 v2 的過濾器、`fields` 和 `expand`。它們位於
`src/mcp/tools/curated.ts` 中。其他一切都要透過[通用工具](./generic-tools.md)。

| 工具                     | 作用                                                              |
| ------------------------ | ----------------------------------------------------------------- |
| `plane_list_work_items`  | 一個專案中的工作項目；省略 `project` 時則是整個工作區中的工作項目 |
| `plane_get_work_item`    | 一個工作項目，按識別符號（`ENG-123`）或者按 UUID 加 `project`     |
| `plane_create_work_item` | 在一個專案中建立一個工作項目                                      |
| `plane_update_work_item` | 修改給出的那些欄位，並且只傳送那些欄位                            |

除非配置了預設工作區，否則 `slug` 是必須的。`project` 是一個專案 UUID 或者它的識別符號（`ENG`），
`workItem` 則是一個像 `ENG-123` 這樣的識別符號或者一個 UUID。用識別符號的時候不需要專案：它會透過一次覆蓋
整個工作區的查詢來解析。

## `plane_list_work_items`

| 輸入           | 含義                                                                    |
| -------------- | ----------------------------------------------------------------------- |
| `project?`     | 一個專案；省略時則是整個工作區                                          |
| `search?`      | 自由文字搜尋                                                            |
| `state_id?`    | 一個狀態                                                                |
| `state_group?` | `backlog`、`unstarted`、`started`、`completed`、`cancelled` 或 `triage` |
| `assignee_id?` | 一個經辦人                                                              |
| `label_id?`    | 一個標籤                                                                |
| `priority?`    | `none`、`low`、`medium`、`high` 或 `urgent`                             |
| `cycle_id?`    | 一個迭代週期                                                            |
| `module_id?`   | 一個模組                                                                |
| `order_by?`    | 一個排序方式，例如 `-updated_at`                                        |
| `fields?`      | 只返回這些欄位，例如 `["name", "state_id"]`                             |
| `per_page?`    | 頁面大小，1–100                                                         |
| `offset?`      | 要跳過的行數，用於下一頁                                                |

對於這些輸入沒有覆蓋到的過濾器，請對 `workspaces.projects.workItems` 的 `list` 執行 `plane_describe`。

## `plane_get_work_item`

`workItem`，再加上 `project`（只在 `workItem` 是 UUID 時需要）和 `expand`（要內聯的相關物件，例如
`["state", "labels"]`）。

## `plane_create_work_item` 和 `plane_update_work_item`

兩者都接受 `project`（建立時）或者 `workItem`（更新時），然後是工作項目本身的欄位。建立時 `name` 是必需
的。

| 欄位                         | 含義                                        |
| ---------------------------- | ------------------------------------------- |
| `name`                       | 標題                                        |
| `description_html`           | 作為 HTML 的描述，例如 `<p>text</p>`        |
| `state` / `state_id`         | 一個狀態名（`In Progress`）或者它的 id      |
| `priority`                   | `none`、`low`、`medium`、`high` 或 `urgent` |
| `assignees` / `assignee_ids` | 經辦人的郵箱，或者他們的 id                 |
| `labels` / `label_ids`       | 標籤名，或者它們的 id                       |
| `parent`                     | 父工作項目的識別符號或 id                   |
| `type`                       | 一個工作項目型別名                          |
| `start_date` / `target_date` | `YYYY-MM-DD`；目標日期不能早於開始日期      |
| `estimate`                   | 一個估算值                                  |
| `cycle_id`                   | 一個迭代週期 id，或者 `null`                |

## 在沒有 API v2 的例項上

在自託管的 Plane 1.4.x 上，這四個工具會用相同的輸入透過 v1（`src/mcp/tools/work-items-v1.ts`）來回答。
只有 v2 能提供的那些引數（`cycle_id`、`module_id`、`order_by`、`fields`、`expand`、`type`、`estimate`）
會按名字失敗，而不是被忽略。
