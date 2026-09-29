---
sidebar_position: 6
title: 配置
description: "MCP 服务器、plane-mcp 可执行文件和 plane CLI 共用的四项设置：保存位置与优先顺序。"
---

# 配置

服务器、`plane-mcp` 这个 bin 和 `plane` 这个 CLI 读取的是同样的四项设置：

| 设置              | 标志位        | 默认值                 | 含义                                                   |
| ----------------- | ------------- | ---------------------- | ------------------------------------------------------ |
| `PLANE_API_KEY`   | `--api-key`   | 无（必需）             | Plane 的 API 密钥，作为 `X-Api-Key` 发送               |
| `PLANE_BASE_URL`  | `--base-url`  | `https://api.plane.so` | 这个 Plane 实例：Plane Cloud，或者你自托管的 URL       |
| `PLANE_WORKSPACE` | `--workspace` | 无                     | 一个默认工作区：有了它，每个工具的 `slug` 都变成可选的 |
| `PORT`            | `--port`      | `3766`                 | HTTP 服务器在 `127.0.0.1` 上监听的端口                 |

每一项都会按照下面的顺序，取第一个有值的来源：一个标志位、环境变量、已保存的文件、默认值。这个解析过程
位于 `resolveMcpConfig`（`src/mcp/config.ts`）中。

## 已保存的文件

`plane mcp config` 会把设置保存到一个按用户区分的 `.env` 文件里：

| 操作系统 | 路径                                             |
| -------- | ------------------------------------------------ |
| Linux    | `~/.config/plane/.env`（尊重 `XDG_CONFIG_HOME`） |
| macOS    | `~/Library/Application Support/plane/.env`       |
| Windows  | `%APPDATA%\plane\.env`                           |

`PLANE_CONFIG`（或者 `--config`）可以指向另一个文件。后台服务器的 pid 文件和日志就存放在它旁边的一个
`run/` 文件夹里。

```text
PLANE_API_KEY=plane_api_0123456789abcdef
PLANE_BASE_URL=https://plane.example.com
PLANE_WORKSPACE=acme
PORT=3766
```

除了 `plane mcp config` 和 `plane mcp uninstall` 之外，每一个 `plane` 命令在这个文件持有一个 API 密钥
之前都会拒绝运行。此后，标志位和环境变量只会在这一次运行中覆盖已保存的值。`plane-mcp` 以及进程内运行的
`plane <tool>` 也都会读取这个已保存的文件。

三种写入它的方式请参见 [`plane mcp config`](../cli/mcp-commands.md#plane-mcp-config)。

## 从代码中使用

同样的解析逻辑也被导出了，方便想要复用已保存配置的工具使用：

```ts
import { configFilePath, readEnvFile, resolveMcpConfig, startPlaneMcpServer } from "@hoyasumii/plane/mcp";

const config = resolveMcpConfig({ env: process.env, file: readEnvFile(configFilePath()) });
if (!config.apiKey) throw new Error("run `plane mcp config` first");

const server = await startPlaneMcpServer(config);
console.log(server.url);
```
