---
sidebar_position: 3
title: 任務工具
description: "MCP 任務工具：依鍵操作任務，依名稱操作專案、狀態、標籤與成員，並輸出易讀的結果。"
---

# 任務工具

這些工具是任務驅動型代理工作流所依賴的穩定契約。它們按鍵（`ACME-130`）來處理任務，按名稱來處理專案、狀
態、標籤和成員，並返回不帶 id 的可讀輸出。它們位於 `src/mcp/tools/kit.ts` 中。

每個工具都接受一個可選的 `slug`（工作區）。配置了預設工作區（`PLANE_WORKSPACE`）之後，它在任何地方都可
以省略。

| 工具                     | 作用                                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `plane_whoami`           | 這個金鑰對應的使用者、工作區、base URL，以及這個例項提供的 API 版本（`v1`/`v2`）          |
| `plane_list_projects`    | 工作區中的專案，帶有用在鍵裡的那個識別符號                                                |
| `plane_list_my_issues`   | 分配給我的任務（預設只顯示未完成的），可以是一個專案裡的，也可以是所有專案裡的            |
| `plane_search_issues`    | 按文字、按經辦人和按狀態分組來搜尋一個專案裡的任務                                        |
| `plane_get_issue`        | 一個任務：狀態與分組、優先順序、按名字給出的經辦人與標籤、日期、`url`，以及作為文字的描述 |
| `plane_get_issue_images` | 把描述中的圖片下載為 `image-<n>.<ext>`（預設在 `<tmp>/plane-mcp/<KEY>/` 下）              |
| `plane_list_comments`    | 一個任務的評論，按時間從舊到新：作者、日期、正文                                          |
| `plane_add_comment`      | 以這個金鑰對應的使用者身份發表評論                                                        |
| `plane_create_issue`     | 建立一個任務，按名字寫入狀態、標籤和經辦人                                                |
| `plane_update_issue`     | 只修改給出的那些欄位                                                                      |
| `plane_list_states`      | 這個專案的狀態，帶有它們所屬的分組                                                        |
| `plane_list_labels`      | 這個專案的標籤                                                                            |
| `plane_list_members`     | 可以被指派的人：顯示名和郵箱                                                              |

這些工具都不會刪除任何東西。

## 輸入

| 工具                                                             | 輸入（除了 `slug` 之外）                                                                                                   |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `plane_list_my_issues`                                           | `project?`、`state_groups?`（預設：backlog、unstarted、started）、`limit`（1–200，預設 50）                                |
| `plane_search_issues`                                            | `project`、`query?`、`assignee?`（名字、郵箱或 `"me"`）、`state_groups?`、`limit`（1–200，預設 30）                        |
| `plane_get_issue`                                                | `key`                                                                                                                      |
| `plane_get_issue_images`                                         | `key`、`dir?`（一個絕對路徑的資料夾，缺失時會被建立）                                                                      |
| `plane_list_comments`                                            | `key`                                                                                                                      |
| `plane_add_comment`                                              | `key`、`text`、`format`（`"text"`，預設，或者 `"markdown"`）                                                               |
| `plane_create_issue`                                             | `project`、`title`、`description?`、`state?`、`priority?`、`assignees?`、`labels?`、`start_date?`、`target_date?`          |
| `plane_update_issue`                                             | `key`，再加上 `title`、`description`、`state`、`priority`、`assignees`、`labels`、`start_date`、`target_date` 中的任意幾個 |
| `plane_list_states` / `plane_list_labels` / `plane_list_members` | `project`                                                                                                                  |

狀態分組是 `backlog`、`unstarted`、`started`、`completed` 和 `cancelled`。優先順序是 `urgent`、`high`、
`medium`、`low` 和 `none`。日期格式是 `YYYY-MM-DD`。

## 名字是如何被解析的

- **專案**：按識別符號（`ACME`）、名字或 id。
- **狀態**和**標籤**：在任務所屬的專案內，按名字。
- **成員**：按 `"me"`、郵箱、顯示名、全名或 id。

一個什麼都匹配不上的值會連同一份合法選項的清單一起失敗，這樣代理就可以自我糾正。

## 寫入

- `plane_create_issue` 會把任務指派給這個金鑰對應的使用者，除非給出了 `assignees`（`[]` 表示誰都不指派）。
- 在 `plane_update_issue` 中，`assignees` 和 `labels` 會替換掉整個列表，`description` 會替換掉整段描
  述，一個 `null` 日期會清除它。完全不傳任何欄位是一個錯誤。
- `description` 是純文字：每一行會變成一個段落。
- 在 `plane_add_comment` 中，`format: "text"` 會讓每一行變成一個段落；`format: "markdown"` 會渲染 GFM
  （標題、列表、核取方塊、粗體）並對原始 HTML 進行轉義。

## 圖片

在 `plane_get_issue` 中，描述裡的每一張圖片都會變成文字中的一個 `[image n]` 標記，並列在 `images` 裡。
`plane_get_issue_images` 會按同樣的順序把它們儲存為 `image-<n>.<ext>`，這樣代理就可以用它自己的檔案讀
取工具開啟它們。它會從檔案簽名裡檢測型別，並把每個檔案的大小上限設為 20 MB。一張失敗或者外部的圖片不會
阻止其他圖片被處理。

在 Plane 1.4.2 上，文件記載的那個資產下載介面（`GET /workspaces/<ws>/assets/<id>/`）會返回 500。因此服
務器改為呼叫 `client.workItems.attachments.download`，它會從附件詳情裡讀取重定向，並跟隨那個簽名 URL，
而不會傳送 API 金鑰。

## 速率限制與快取

Plane 允許每分鐘 60 次請求。遇到 `429` 時，伺服器會等待一次 `Retry-After`（最多 60 秒）然後重試。專案、
狀態、標籤、成員和當前使用者會被快取五分鐘，由這個行程處理的每一個請求共享。
