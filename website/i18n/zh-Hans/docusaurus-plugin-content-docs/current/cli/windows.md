---
sidebar_position: 3
title: Windows 与 WSL
description: "在 Windows 10/11 上通过 PowerShell 或 cmd 使用 CLI，并从 WSL 将服务器注册到 Windows 客户端。"
---

# Windows 与 WSL

CLI 中的一切都是为了能在装有 Node.js 20 或更高版本的 Windows 10/11 上，从 PowerShell 或 cmd 中工作而
构建的。它已经实现并做过单元测试，但还没有在一个原生 Windows 安装上做过冒烟测试。下面这条 WSL 桥接路
径已经被端到端验证过。

- 设置文件位于 `%APPDATA%\plane\.env`，由该文件夹的按用户权限保护（文件权限模式在 Windows 上没有意
  义）。
- `plane mcp boot enable` 会注册一个登录任务（logon task）。
- `plane mcp stop` 会先通过一个有令牌保护的 `POST /shutdown` 请求让服务器关闭，失败之后再退回到直接终
  止它。
- 客户端的各个 CLI 都是通过 `cross-spawn` 运行的，所以 Windows 的 `.cmd` shim 可以正常工作。

## 从 WSL 内部

当这个包被安装在 WSL 内部时，`plane mcp install` 和 `uninstall` 还会列出安装在 Windows 一侧的客户端，
写作 `Claude Code (Windows)` 之类（`--client claude@windows`）。它们会用
`wsl.exe -d <distro> -e node …/dist/mcp/cli.js` 来启动服务器，这样它就依然读取的是保存在 WSL 内部的配
置。WSL 闲置之后的第一次调用要为这个发行版的启动付出一点代价（一两秒）。

Windows 一侧是通过 `powershell.exe` 访问的，它取自 PATH，或者在 `appendWindowsPath = false` 时，取自
`/mnt/c/Windows/System32/WindowsPowerShell/v1.0/`。当它无法被访问到时，`--client claude@windows` 会说
明是哪一步失败了。

要在 WSL 内部实现登录时启动服务器，请先在 `/etc/wsl.conf` 中启用 systemd，然后运行
`npx plane mcp boot enable`。
