---
sidebar_position: 1
title: 快速入門
description: "面向 Plane API 的 TypeScript SDK，以及建構於其上的 MCP 伺服器與 CLI：各部分的用途與安裝方式。"
slug: /intro
---

# 快速入門

`@hoyasumii/plane` 是一個面向 [Plane](https://plane.so) API 的 TypeScript SDK，內建了一個 MCP 伺服器和一個
CLI。你可以在程式碼中使用它、從 AI 代理中使用它，或者在終端中使用它：三者共享同一個客戶端。

- **SDK**：一個覆蓋 API v1 和整個 v2 表面（`client.v2`，90 個資源）的型別化客戶端。`fields` 會在編譯期縮小
  返回型別，載入後的行可以導航到它們的子項。從 [API v2](./sdk/v2/overview.md) 開始。
- **MCP 伺服器**（`@hoyasumii/plane/mcp`）：stdio 或 Streamable HTTP。它提供按鍵和按名稱工作的任務工具
  （`ACME-130`、`"Todo"`、`"me"`），以及可以存取所有 v2 方法的通用工具。從 [MCP 伺服器](./mcp/overview.md)
  開始。
- **CLI**（`plane`）：每個 MCP 工具都是一個子命令，還有 `plane mcp` 用來配置伺服器、在後臺執行它、在登入
  時啟動它，並將它註冊到 Claude Code、Codex 和 OpenCode 中。從 [CLI](./cli/overview.md) 開始。

它可以配合 Plane Cloud 使用，也可以配合自託管例項使用，包括沒有 API v2 的自託管 1.4.x。

## 安裝

需要 Node.js 20 或更高版本。

```bash
npm install @hoyasumii/plane
# 或者
pnpm add @hoyasumii/plane
```

## 快速開始

用一個 API 金鑰（Plane → 工作區設定 → API tokens）或者一個 OAuth 存取權杖建立客戶端。`baseUrl` 預設是
Plane Cloud（`https://api.plane.so`）；自託管時請把它指向你自己的例項。

```ts
import { PlaneClient } from "@hoyasumii/plane";

const client = new PlaneClient({ apiKey: "your-api-key" });

// API v2：路徑 id 是位置引數，排在最前，順序與 URL 一致。
const states = await client.v2.workspaces.projects.states.list("acme", "ENG");

// 已載入的行攜帶著自己的 id，所以它的子項不需要再傳 id。
const eng = await client.v2.workspaces.projects.retrieve("acme", "ENG");
await eng.workItems.create({ name: "Fix login bug", state: "Todo", labels: ["bug"] });

// API v1 也在同一個客戶端上。
const projects = await client.projects.list("acme");
```

## 從 AI 代理中使用

儲存一次設定，然後在你機器上安裝的客戶端中註冊 MCP 伺服器：

```bash
npx plane mcp config    # 詢問 API 金鑰、例項 URL 和預設工作區
npx plane mcp install   # 在 Claude Code、Codex 和 OpenCode 中註冊 plane-mcp
```

[MCP 設定](./mcp/setup.md) 介紹了手動配置和 HTTP 傳輸方式。

## 從終端中使用

執行過 `plane mcp config` 之後，每個 MCP 工具都是一條命令：

```bash
npx plane whoami
npx plane list-my-issues
npx plane get-issue --key ACME-14
```

參見 [CLI](./cli/overview.md)。
