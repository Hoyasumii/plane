---
sidebar_position: 5
title: 通用工具
description: "plane_resources、plane_describe 與 plane_call：涵蓋全部 90 個資源、可呼叫每個 API v2 方法的三個 MCP 工具。"
---

# 通用工具

有三個工具可以存取 SDK 擁有的每一個 v2 方法，涵蓋全部 90 個資源：迭代週期、模組、頁面、釋出
（release）、計劃（initiative）、客戶、webhook，以及其他所有資源。它們位於 `src/mcp/tools/generic.ts`
中。

1. **`plane_resources`** 用來查詢一個資源。不帶 `query` 時，它會列出每一個資源路徑及其方法名。帶上
   `query`（`"cycle work items"`、`"webhook"`）時，它會顯示匹配的資源及其方法簽名。
2. **`plane_describe`** 接受一個 `resource` 和一個 `method`，並顯示完整的簽名：按呼叫順序排列的引數
   （包括寫入體裡的欄位）、其中哪些是路徑 id、允許的 `fields`/`expand`/`order_by`/過濾器取值，以及一個
   示例性的 `plane_call` 輸入。
3. **`plane_call`** 會執行這個方法，並按引數名傳入它的引數。

代理眼中的一次典型往返：

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

| 輸入       | 含義                                                                                |
| ---------- | ----------------------------------------------------------------------------------- |
| `resource` | 用點分隔的資源路徑，例如 `workspaces.projects.states`                               |
| `method`   | 方法名，例如 `list`、`create`、`add`                                                |
| `args`     | 按引數名給出的引數：先是路徑 id（`slug`、`project`……），然後是 `data`/`params` 物件 |
| `limit`    | 用於 `iterate` 方法：要收集多少條（預設 100，最多 1000）                            |
| `confirm`  | 執行一個破壞性方法時必須是 `true`                                                   |

`slug` 預設使用已配置的工作區。列表 `params` 接受 `fields`、過濾器、`order_by`、`per_page` 和 `offset`。
超過 60,000 個字元的結果會被截斷，並帶有說明這一點的備註。

**破壞性方法**（`delete`、`bulkDelete`、`remove`、`unlink`）在沒有 `confirm: true` 時會拒絕執行。該工具
的描述會告訴代理先去詢問使用者。

## 目錄（catalog）

通用工具讀取的是 `src/mcp/generated/catalog.json`：資源路徑、按呼叫順序排列的引數名，以及來自 api_v2
OpenAPI 文件的允許值。它是由 `pnpm codegen:mcp` 從 SDK 原始碼生成的，絕不手動編輯。

`plane_call` 只能存取目錄裡的方法，並按目錄宣告的引數名來排列具名引數的順序。在沒有 API v2 的例項上，
`plane_resources` 和 `plane_call` 會拒絕執行，並給出一條指向那些型別化工具的訊息；`plane_describe` 仍
然可以工作，因為它只讀取目錄。
