---
sidebar_position: 1
title: CLI 概览
description: "plane 命令：每个 MCP 工具都是一个子命令，工具的输入 schema 即为其参数。"
---

# CLI

这个包会安装一个 `plane` 命令。它是[同一个服务器](../mcp/overview.md)的一个 MCP 客户端：每一个 MCP 工
具都变成了一个子命令，工具的输入 schema 变成了它的标志位。默认情况下，服务器就在这个命令内部运行，所以
没有什么需要提前启动的东西。

```bash
npx plane mcp config                 # 一次性操作：保存 API 密钥（PLANE_BASE_URL 默认是 https://api.plane.so）
npx plane tools                      # 每一条命令，一个 MCP 工具对应一条
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

除了 `--help`、`--version` 和 `plane docs` 之外，任何命令都不会运行，直到 `plane mcp config` 用一个
API 密钥保存了一份配置为止。`plane docs` 会打印这个站点的链接，并在浏览器里打开它。

## 从工具到命令

- 命令是工具的名字去掉 `plane_` 前缀，写成 kebab-case：`plane_list_work_items` → `list-work-items`。
- 每个标志位是一个 kebab-case 的输入：`per_page` → `--per-page`，`workItem` → `--work-item`。
- 数组标志位接受 `a,b` 或者 JSON，对象标志位接受 JSON，布尔标志位不需要值。
- `plane <command> --help` 会列出一个命令的标志位，包括枚举类输入的允许值。

工具的输出会写到 stdout。工具的错误会写到 stderr，退出码为 1。

## 与一个正在运行的服务器通信

要使用一个已经通过 HTTP 运行着的 `plane-mcp`，而不是进程内的那个，可以传入
`--url http://127.0.0.1:3766/mcp`，或者设置 `PLANE_MCP_URL`。`--base-url` 和 `--api-key` 会覆盖进程内
服务器所用的环境变量和已保存的文件。

这些标志位都不能替代已保存的配置：即便给出了 `--url` 或 `--api-key`，CLI 也会拒绝在没有它的情况下运行
工具。

## 管理服务器

`plane mcp` 会在建立任何连接之前被拦截下来。它负责配置服务器、在后台运行它、在登录时启动它，并把它注册
到你的 MCP 客户端里。参见 [`plane mcp`](./mcp-commands.md)。
