---
sidebar_position: 2
title: 设置
description: "只需保存一次设置，即可在 Claude Code、Codex 和 OpenCode 中注册 Plane MCP 服务器。"
---

# 设置

## 快捷方式

保存一次你的设置，然后让 CLI 在它找到的客户端里注册这个服务器：

```bash
npx plane mcp config    # 询问 API 密钥、实例 URL、默认工作区和端口
npx plane mcp install   # 在你 PATH 中找到 Claude Code、Codex 和 OpenCode，并注册 plane-mcp（stdio）
```

`install` 会显示一份它找到的客户端清单。勾选你想要的那些，它就会通过每个客户端自己的 CLI，用 `plane`
这个名字注册这个服务器。被注册的命令会在客户端启动它的时候读取已保存的配置，所以不会有任何 API 密钥留
在客户端的配置里。各个标志位请参见 [`plane mcp install`](../cli/mcp-commands.md#plane-mcp-install)。

## 手动方式：stdio

让客户端启动 `plane-mcp`。它会读取已保存的配置，所以客户端配置里不需要任何密钥：

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

如果没有已保存的配置，或者想覆盖它，可以给客户端一个带有 `PLANE_API_KEY`、`PLANE_BASE_URL` 和
`PLANE_WORKSPACE` 的 `env` 块：

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

## 手动方式：HTTP

在后台运行一个服务器，然后把你的客户端指向它的 URL：

```bash
npx plane mcp start          # 打印出这个 URL，默认是 http://127.0.0.1:3766/mcp
claude mcp add --transport http plane http://127.0.0.1:3766/mcp
```

不使用 CLI 的话：`PORT=3766 PLANE_BASE_URL=... PLANE_API_KEY=... npx plane-mcp --http` 会在前台运行它。
`plane-mcp --help` 列出了所有标志位。要在每次登录时启动这个服务器，运行
`npx plane mcp boot enable`（参见 [`plane mcp boot`](../cli/mcp-commands.md#plane-mcp-boot)）。

## 检查它是否工作

让你的代理调用 `plane_whoami`，或者从终端运行它：

```bash
npx plane whoami
```

它会回答这个密钥对应的用户、默认工作区、base URL，以及这个实例提供的 API 版本。
