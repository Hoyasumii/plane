---
sidebar_position: 2
title: plane mcp
description: "plane mcp：保存配置、在后台运行服务器、登录时自动启动，并将其注册到你的 MCP 客户端。"
---

# `plane mcp`

`plane mcp` 帮你管理 MCP 服务器：它的已保存配置、一个后台 HTTP 服务器、一个登录服务，以及它在你的 MCP
客户端里的注册情况。

```bash
npx plane mcp config                 # 在终端里询问各项设置并保存它们
npx plane mcp config --workspace acme --port 4000   # 不询问（脚本、CI 场景）：只保存这些，其余保持不变
npx plane mcp config --web           # 同样的效果，通过一个本地网页表单完成
npx plane mcp install                # 挑选 Claude Code / Codex / OpenCode，并在其中注册 plane-mcp（stdio）
npx plane mcp install --client claude,opencode --force   # 不弹出选择器（脚本、CI 场景）；--force 会替换已有条目
npx plane mcp uninstall              # 挑选要移除 'plane' 条目的客户端（不需要已保存的配置）
npx plane mcp start                  # 在后台启动（需要已保存的配置）；打印出用于 `claude mcp add` 的 URL
npx plane mcp start --api-key other --port 4000   # 一次性的值，绝不会被保存
npx plane mcp status                 # 正在运行还是已停止（退出码 3）、URL、pid、运行时长
npx plane mcp stop
npx plane mcp boot enable            # 每次登录时启动；`boot disable` / `boot status`
```

## `plane mcp config`

写入已保存的 `.env` 文件（[配置](../mcp/configuration.md)）。它有三种工作方式：

- **在终端中**（默认方式）。它会依次询问每一项设置，从已保存的值开始。密钥会以掩码方式输入，直接按回
  车则保留已保存的那个。对于其他设置，清空这一行（Ctrl+U）可以回到默认值。
- **用标志位。** 给出 `--api-key`、`--base-url`、`--workspace` 或 `--port` 中的任意一个，它就什么都不
  问，只保存这些（`--workspace=` 会清除这一项）。没有终端时，它需要这些标志位。把密钥作为标志位传入会
  留在你的 shell 历史里，所以更推荐用交互式提示来输入它。
- **在一个网页表单里**，用 `--web`：一个本地页面，会在浏览器里打开（`--no-open` 则只打印它的 URL）。

如果有一个服务器正在运行，它会被告知要重启以应用这些更改。`--config <file>`（或者 `PLANE_CONFIG`）会
写入另一个文件。

## `plane mcp install`

通过运行每个客户端的 `--version` 来检测它，并通过该客户端自己的 CLI，以 `plane` 这个名字注册这个 stdio
服务器：

| 客户端      | 它运行的命令                |
| ----------- | --------------------------- |
| Claude Code | `claude mcp add -s user`    |
| Codex       | `codex mcp add`             |
| OpenCode    | `opencode mcp add --global` |

被注册的命令是按绝对路径写的 `node <package>/dist/mcp/cli.js`，不带任何 API 密钥：服务器会在客户端启动
它的时候读取已保存的文件（只有在给了 `--config` 来指定另一个文件时，才会传递 `PLANE_CONFIG`）。

每一个被找到的客户端默认都是勾选状态的。一个已经有 `plane` 条目的客户端会被标记为
`already installed, reinstalls`，并会被替换掉。在没有交互式终端的情况下，`--client` 是必需的
（`claude`、`codex`、`opencode`；在 WSL 内部还有 `claude@windows`、`codex@windows`、
`opencode@windows`），并且需要加上 `--force` 才能替换一个已有条目。`--dry-run` 会打印出这些命令，而不
是真正运行它们。

`install` 和 `uninstall` 都只作用于每个客户端的用户级（全局）配置。项目范围内的条目永远不会被改动。

## `plane mcp uninstall`

列出带有 `plane` 条目的客户端，显示它是 `stdio` 还是 `http`，并移除任何这个名字的条目：
`claude mcp remove -s user`、`codex mcp remove`，以及对于 OpenCode（它没有 `remove`）——对它的全局配置
文件做一次编辑，只删除那一个键，保留其余的注释和格式。

除了 `plane mcp config` 之外，它是唯一一个不需要已保存配置就能运行的命令，这样即便配置已经不在了，也
可以清理某个客户端。`--client` 和 `--dry-run` 的用法和 `install` 中一样。

## `plane mcp start`、`stop` 和 `status`

`start` 会以分离（detached）方式运行这个 HTTP 服务器，并打印出它的 URL、它的日志文件，以及用来注册它
的那条 `claude mcp add` 命令。它需要一份已保存的配置。`--api-key`、`--base-url`、`--workspace` 和
`--port` 只会为这一次运行覆盖它，并且绝不会被保存。`--foreground` 会改为在当前进程里提供服务。

`status` 会打印出这个服务器是否在运行，包括它的 URL、pid 和运行时长，如果没有在运行，则以退出码 3 退
出。`stop` 会通过一个有令牌保护的 `POST /shutdown` 请求，来要求服务器关闭；只有在这样做失败时，才会向
这个进程发送信号。

## `plane mcp boot`

`boot enable` 会安装一个属于当前用户的服务，让它在每次登录时启动这个服务器，因此不需要 sudo：

| 操作系统 | 服务                                                                      |
| -------- | ------------------------------------------------------------------------- |
| Linux    | 一个 systemd 用户单元（在 WSL 上，需要在 `/etc/wsl.conf` 里启用 systemd） |
| macOS    | 一个 LaunchAgent                                                          |
| Windows  | 一个登录任务（logon task）                                                |

这个服务只会读取已保存的配置。`boot disable` 会移除它，`boot status` 会报告它的状态。
