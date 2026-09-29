---
sidebar_position: 1
title: 快速入门
description: "面向 Plane API 的 TypeScript SDK，以及基于它构建的 MCP 服务器和 CLI：各部分的作用与安装方法。"
slug: /intro
---

# 快速入门

`@hoyasumii/plane` 是一个面向 [Plane](https://plane.so) API 的 TypeScript SDK，内置了一个 MCP 服务器和一个
CLI。你可以在代码中使用它、从 AI 代理中使用它，或者在终端中使用它：三者共享同一个客户端。

- **SDK**：一个覆盖 API v1 和整个 v2 表面（`client.v2`，90 个资源）的类型化客户端。`fields` 会在编译期缩小
  返回类型，加载后的行可以导航到它们的子项。从 [API v2](./sdk/v2/overview.md) 开始。
- **MCP 服务器**（`@hoyasumii/plane/mcp`）：stdio 或 Streamable HTTP。它提供按键和按名称工作的任务工具
  （`ACME-130`、`"Todo"`、`"me"`），以及可以访问所有 v2 方法的通用工具。从 [MCP 服务器](./mcp/overview.md)
  开始。
- **CLI**（`plane`）：每个 MCP 工具都是一个子命令，还有 `plane mcp` 用来配置服务器、在后台运行它、在登录
  时启动它，并将它注册到 Claude Code、Codex 和 OpenCode 中。从 [CLI](./cli/overview.md) 开始。

它可以配合 Plane Cloud 使用，也可以配合自托管实例使用，包括没有 API v2 的自托管 1.4.x。

## 安装

需要 Node.js 20 或更高版本。

```bash
npm install @hoyasumii/plane
# 或者
pnpm add @hoyasumii/plane
```

## 快速开始

用一个 API 密钥（Plane → 工作区设置 → API tokens）或者一个 OAuth 访问令牌创建客户端。`baseUrl` 默认是
Plane Cloud（`https://api.plane.so`）；自托管时请把它指向你自己的实例。

```ts
import { PlaneClient } from "@hoyasumii/plane";

const client = new PlaneClient({ apiKey: "your-api-key" });

// API v2：路径 id 是位置参数，排在最前，顺序与 URL 一致。
const states = await client.v2.workspaces.projects.states.list("acme", "ENG");

// 已加载的行携带着自己的 id，所以它的子项不需要再传 id。
const eng = await client.v2.workspaces.projects.retrieve("acme", "ENG");
await eng.workItems.create({ name: "Fix login bug", state: "Todo", labels: ["bug"] });

// API v1 也在同一个客户端上。
const projects = await client.projects.list("acme");
```

## 从 AI 代理中使用

保存一次设置，然后在你机器上安装的客户端中注册 MCP 服务器：

```bash
npx plane mcp config    # 询问 API 密钥、实例 URL 和默认工作区
npx plane mcp install   # 在 Claude Code、Codex 和 OpenCode 中注册 plane-mcp
```

[MCP 设置](./mcp/setup.md) 介绍了手动配置和 HTTP 传输方式。

## 从终端中使用

运行过 `plane mcp config` 之后，每个 MCP 工具都是一条命令：

```bash
npx plane whoami
npx plane list-my-issues
npx plane get-issue --key ACME-14
```

参见 [CLI](./cli/overview.md)。
