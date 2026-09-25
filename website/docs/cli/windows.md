---
sidebar_position: 3
title: Windows and WSL
---

# Windows and WSL

Everything in the CLI is built to work from PowerShell or cmd on Windows 10/11 with Node.js 20 or later. It is
implemented and unit-tested, but not yet smoke-tested on a native Windows install. The WSL bridge below has
been verified end to end.

- The settings file lives in `%APPDATA%\plane\.env`, protected by that folder's per-user permissions (file modes
  mean nothing on Windows).
- `plane mcp boot enable` registers a logon task.
- `plane mcp stop` asks the server to shut down through a token-guarded `POST /shutdown` before falling back to
  terminating it.
- The client CLIs are run through `cross-spawn`, so Windows `.cmd` shims work.

## From WSL

When the package is installed inside WSL, `plane mcp install` and `uninstall` also list the clients installed on
the Windows side, as `Claude Code (Windows)` and so on (`--client claude@windows`). They start the server with
`wsl.exe -d <distro> -e node …/dist/mcp/cli.js`, so it keeps reading the configuration saved inside WSL. The
first call after WSL has been idle pays for the distro starting (a second or two).

The Windows side is reached through `powershell.exe`, taken from the PATH or, with `appendWindowsPath = false`,
from `/mnt/c/Windows/System32/WindowsPowerShell/v1.0/`. When it cannot be reached, `--client claude@windows`
says which step failed.

To start the server at login inside WSL, enable systemd in `/etc/wsl.conf` first, then run
`npx plane mcp boot enable`.
