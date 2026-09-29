---
sidebar_position: 1
title: MCP 服务器概览
description: "Plane MCP 服务器：让 Claude Code、Codex、OpenCode、Claude Desktop 及任何 MCP 客户端都能使用 Plane。"
---

# MCP 服务器

`@hoyasumii/plane/mcp` 把这个 SDK 变成了一个 [MCP](https://modelcontextprotocol.io) 服务器，这样 Claude
Code、Codex、OpenCode、Claude Desktop 或者任何其他 MCP 客户端都可以和 Plane 协同工作。

## 两种传输方式

| 传输方式            | 谁来运行服务器                            | 如何启动它                                              |
| ------------------- | ----------------------------------------- | ------------------------------------------------------- |
| **stdio**（默认）   | MCP 客户端启动 `plane-mcp` 并拥有这个进程 | `plane mcp install`，或者手动注册 `plane-mcp`           |
| **Streamable HTTP** | 一个长期运行、被多个客户端共享的服务器    | `plane mcp start`、`plane-mcp --http`，或者从代码里启动 |

在 stdio 模式下，服务器随客户端启动，并在客户端关闭 stdin 时结束。stdout 承载着协议内容，所以服务器只向
stderr 写日志。在 HTTP 模式下，它只监听 `127.0.0.1`，以无状态的方式提供 Streamable HTTP
（`POST /mcp`），它的缓存由每一个连接进来的客户端共享。

## 三类工具

- **[任务工具](./task-tools.md)**（`plane_get_issue`、`plane_update_issue`、`plane_add_comment`……）是任务
  驱动型代理工作流所依赖的稳定契约。它们按键（`ACME-130`）来处理任务，按名称来处理项目、状态、标签和成
  员，并返回不带 id 的可读输出。它们始终使用 API v1，因为 Plane Cloud 和自托管实例都提供这个版本。
- **[工作项工具](./work-item-tools.md)**（`plane_list_work_items`、`plane_get_work_item`、
  `plane_create_work_item`、`plane_update_work_item`）使用带有其过滤器、`fields` 和 `expand` 的 API v2。
- **[通用工具](./generic-tools.md)**（`plane_resources`、`plane_describe`、`plane_call`）可以访问所有 90
  个资源上的其他每一个 v2 方法。

## 没有 API v2 的实例

自托管的 Plane 1.4.x 会对每一个 `/api/v2` 路由都返回 404。服务器第一次需要用到它时，会用一次
`GET /api/v2/users/me/` 来判断这一点，并在整个进程的生命周期内记住这个答案。一个错误的密钥或者一次网络
错误不会被记住。在这样的实例上：

- 任务工具照常工作，因为它们本来就用的是 v1。
- `*_work_item` 工具会用相同的输入通过 v1 来回答。只有 v2 能提供的那些参数（`cycle_id`、`module_id`、
  `order_by`、`fields`、`expand`、`type`、`estimate`）会按名字失败。
- `plane_resources` 和 `plane_call` 会说明 v2 不可用，并指向那些类型化工具，而不是把一个 404 转发出去。
  `plane_describe` 仍然可以工作，因为它只读取目录（catalog）。

`plane_whoami` 会报告这个实例提供的是哪个 API（`v1` 或 `v2`）。

## 下一步

- [设置](./setup.md)：在你的 MCP 客户端里注册这个服务器。
- [配置](./configuration.md)：各项设置及它们保存在哪里。
- [编程方式使用](./programmatic.md)：从你自己的代码里启动这个服务器。
