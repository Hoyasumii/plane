---
sidebar_position: 1
title: MCP 伺服器概覽
description: "Plane MCP 伺服器：讓 Claude Code、Codex、OpenCode、Claude Desktop 及任何 MCP 用戶端都能使用 Plane。"
---

# MCP 伺服器

`@hoyasumii/plane/mcp` 把這個 SDK 變成了一個 [MCP](https://modelcontextprotocol.io) 伺服器，這樣 Claude
Code、Codex、OpenCode、Claude Desktop 或者任何其他 MCP 客戶端都可以和 Plane 協同工作。

## 兩種傳輸方式

| 傳輸方式            | 誰來執行伺服器                            | 如何啟動它                                                |
| ------------------- | ----------------------------------------- | --------------------------------------------------------- |
| **stdio**（預設）   | MCP 客戶端啟動 `plane-mcp` 並擁有這個行程 | `plane mcp install`，或者手動註冊 `plane-mcp`             |
| **Streamable HTTP** | 一個長期執行、被多個客戶端共享的伺服器    | `plane mcp start`、`plane-mcp --http`，或者從程式碼裡啟動 |

在 stdio 模式下，伺服器隨客戶端啟動，並在客戶端關閉 stdin 時結束。stdout 承載著協議內容，所以伺服器只向
stderr 寫日誌。在 HTTP 模式下，它只監聽 `127.0.0.1`，以無狀態的方式提供 Streamable HTTP
（`POST /mcp`），它的快取由每一個連線進來的客戶端共享。

## 三類工具

- **[任務工具](./task-tools.md)**（`plane_get_issue`、`plane_update_issue`、`plane_add_comment`……）是任務
  驅動型代理工作流所依賴的穩定契約。它們按鍵（`ACME-130`）來處理任務，按名稱來處理專案、狀態、標籤和成
  員，並返回不帶 id 的可讀輸出。它們始終使用 API v1，因為 Plane Cloud 和自託管例項都提供這個版本。
- **[工作項目工具](./work-item-tools.md)**（`plane_list_work_items`、`plane_get_work_item`、
  `plane_create_work_item`、`plane_update_work_item`）使用帶有其過濾器、`fields` 和 `expand` 的 API v2。
- **[通用工具](./generic-tools.md)**（`plane_resources`、`plane_describe`、`plane_call`）可以存取所有 90
  個資源上的其他每一個 v2 方法。

## 沒有 API v2 的例項

自託管的 Plane 1.4.x 會對每一個 `/api/v2` 路由都返回 404。伺服器第一次需要用到它時，會用一次
`GET /api/v2/users/me/` 來判斷這一點，並在整個行程的生命週期內記住這個答案。一個錯誤的金鑰或者一次網路
錯誤不會被記住。在這樣的例項上：

- 任務工具照常工作，因為它們本來就用的是 v1。
- `*_work_item` 工具會用相同的輸入透過 v1 來回答。只有 v2 能提供的那些引數（`cycle_id`、`module_id`、
  `order_by`、`fields`、`expand`、`type`、`estimate`）會按名字失敗。
- `plane_resources` 和 `plane_call` 會說明 v2 不可用，並指向那些型別化工具，而不是把一個 404 轉發出去。
  `plane_describe` 仍然可以工作，因為它只讀取目錄（catalog）。

`plane_whoami` 會報告這個例項提供的是哪個 API（`v1` 或 `v2`）。

## 下一步

- [設定](./setup.md)：在你的 MCP 客戶端裡註冊這個伺服器。
- [配置](./configuration.md)：各項設定及它們儲存在哪裡。
- [程式設計方式使用](./programmatic.md)：從你自己的程式碼裡啟動這個伺服器。
