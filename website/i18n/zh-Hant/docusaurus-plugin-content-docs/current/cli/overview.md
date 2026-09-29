---
sidebar_position: 1
title: CLI 概覽
description: "plane 指令：每個 MCP 工具都是一個子指令，工具的輸入 schema 即為其旗標。"
---

# CLI

這個包會安裝一個 `plane` 命令。它是[同一個伺服器](../mcp/overview.md)的一個 MCP 客戶端：每一個 MCP 工
具都變成了一個子命令，工具的輸入 schema 變成了它的標誌位。預設情況下，伺服器就在這個命令內部執行，所以
沒有什麼需要提前啟動的東西。

```bash
npx plane mcp config                 # 一次性操作：儲存 API 金鑰（PLANE_BASE_URL 預設是 https://api.plane.so）
npx plane tools                      # 每一條命令，一個 MCP 工具對應一條
npx plane whoami
npx plane get-issue --key ACME-14
npx plane list-my-issues --project ACME
npx plane list-work-items --slug acme --project ENG --per-page 20 --fields name,state_id
npx plane get-work-item --slug acme --work-item ENG-123
npx plane resources --query cycle
npx plane describe --resource workspaces.projects.cycles --method delete
npx plane call --resource workspaces.projects.cycles --method delete \
  --args '{"slug":"acme","project":"ENG","cycle":"<cycle-id>"}' --confirm
```

除了 `--help`、`--version` 和 `plane docs` 之外，任何命令都不會執行，直到 `plane mcp config` 用一個
API 金鑰儲存了一份配置為止。`plane docs` 會列印這個站點的連結，並在瀏覽器裡開啟它。

## 從工具到命令

- 命令是工具的名字去掉 `plane_` 字首，寫成 kebab-case：`plane_list_work_items` → `list-work-items`。
- 每個標誌位是一個 kebab-case 的輸入：`per_page` → `--per-page`，`workItem` → `--work-item`。
- 陣列標誌位接受 `a,b` 或者 JSON，物件標誌位接受 JSON，布林標誌位不需要值。
- `plane <command> --help` 會列出一個命令的標誌位，包括列舉類輸入的允許值。

工具的輸出會寫到 stdout。工具的錯誤會寫到 stderr，退出碼為 1。

## 與一個正在執行的伺服器通訊

要使用一個已經透過 HTTP 執行著的 `plane-mcp`，而不是行程內的那個，可以傳入
`--url http://127.0.0.1:3766/mcp`，或者設定 `PLANE_MCP_URL`。`--base-url` 和 `--api-key` 會覆蓋行程內
伺服器所用的環境變數和已儲存的檔案。

這些標誌位都不能替代已儲存的配置：即便給出了 `--url` 或 `--api-key`，CLI 也會拒絕在沒有它的情況下執行
工具。

## 管理伺服器

`plane mcp` 會在建立任何連線之前被攔截下來。它負責配置伺服器、在後臺執行它、在登入時啟動它，並把它註冊
到你的 MCP 客戶端裡。參見 [`plane mcp`](./mcp-commands.md)。
