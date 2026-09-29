---
sidebar_position: 2
title: 設定
description: "只需儲存一次設定，即可在 Claude Code、Codex 與 OpenCode 中註冊 Plane MCP 伺服器。"
---

# 設定

## 快捷方式

儲存一次你的設定，然後讓 CLI 在它找到的客戶端裡註冊這個伺服器：

```bash
npx plane mcp config    # 詢問 API 金鑰、例項 URL、預設工作區和埠
npx plane mcp install   # 在你 PATH 中找到 Claude Code、Codex 和 OpenCode，並註冊 plane-mcp（stdio）
```

`install` 會顯示一份它找到的客戶端清單。勾選你想要的那些，它就會透過每個客戶端自己的 CLI，用 `plane`
這個名字註冊這個伺服器。被註冊的命令會在客戶端啟動它的時候讀取已儲存的配置，所以不會有任何 API 金鑰留
在客戶端的配置裡。各個標誌位請參見 [`plane mcp install`](../cli/mcp-commands.md#plane-mcp-install)。

## 手動方式：stdio

讓客戶端啟動 `plane-mcp`。它會讀取已儲存的配置，所以客戶端配置裡不需要任何金鑰：

```json
{
  "mcpServers": {
    "plane": { "command": "npx", "args": ["-y", "-p", "@hoyasumii/plane", "plane-mcp"] }
  }
}
```

在 Claude Code 中：

```bash
claude mcp add plane -- npx -y -p @hoyasumii/plane plane-mcp
```

如果沒有已儲存的配置，或者想覆蓋它，可以給客戶端一個帶有 `PLANE_API_KEY`、`PLANE_BASE_URL` 和
`PLANE_WORKSPACE` 的 `env` 塊：

```json
{
  "mcpServers": {
    "plane": {
      "command": "npx",
      "args": ["-y", "-p", "@hoyasumii/plane", "plane-mcp"],
      "env": { "PLANE_API_KEY": "your-api-key", "PLANE_WORKSPACE": "acme" }
    }
  }
}
```

## 手動方式：HTTP

在後臺執行一個伺服器，然後把你的客戶端指向它的 URL：

```bash
npx plane mcp start          # 列印出這個 URL，預設是 http://127.0.0.1:3766/mcp
claude mcp add --transport http plane http://127.0.0.1:3766/mcp
```

不使用 CLI 的話：`PORT=3766 PLANE_BASE_URL=... PLANE_API_KEY=... npx plane-mcp --http` 會在前臺執行它。
`plane-mcp --help` 列出了所有標誌位。要在每次登入時啟動這個伺服器，執行
`npx plane mcp boot enable`（參見 [`plane mcp boot`](../cli/mcp-commands.md#plane-mcp-boot)）。

## 檢查它是否工作

讓你的代理呼叫 `plane_whoami`，或者從終端執行它：

```bash
npx plane whoami
```

它會回答這個金鑰對應的使用者、預設工作區、base URL，以及這個例項提供的 API 版本。
