---
sidebar_position: 3
title: Windows 與 WSL
description: "在 Windows 10/11 上透過 PowerShell 或 cmd 使用 CLI，並從 WSL 將伺服器註冊到 Windows 用戶端。"
---

# Windows 與 WSL

CLI 中的一切都是為了能在裝有 Node.js 20 或更高版本的 Windows 10/11 上，從 PowerShell 或 cmd 中工作而
構建的。它已經實現並做過單元測試，但還沒有在一個原生 Windows 安裝上做過冒煙測試。下面這條 WSL 橋接路
徑已經被端到端驗證過。

- 設定檔案位於 `%APPDATA%\plane\.env`，由該資料夾的按使用者許可權保護（檔案許可權模式在 Windows 上沒有意
  義）。
- `plane mcp boot enable` 會註冊一個登入任務（logon task）。
- `plane mcp stop` 會先透過一個有權杖保護的 `POST /shutdown` 請求讓伺服器關閉，失敗之後再退回到直接終
  止它。
- 客戶端的各個 CLI 都是透過 `cross-spawn` 執行的，所以 Windows 的 `.cmd` shim 可以正常工作。

## 從 WSL 內部

當這個包被安裝在 WSL 內部時，`plane mcp install` 和 `uninstall` 還會列出安裝在 Windows 一側的客戶端，
寫作 `Claude Code (Windows)` 之類（`--client claude@windows`）。它們會用
`wsl.exe -d <distro> -e node …/dist/mcp/cli.js` 來啟動伺服器，這樣它就依然讀取的是儲存在 WSL 內部的配
置。WSL 閒置之後的第一次呼叫要為這個發行版的啟動付出一點代價（一兩秒）。

Windows 一側是透過 `powershell.exe` 存取的，它取自 PATH，或者在 `appendWindowsPath = false` 時，取自
`/mnt/c/Windows/System32/WindowsPowerShell/v1.0/`。當它無法被存取到時，`--client claude@windows` 會說
明是哪一步失敗了。

要在 WSL 內部實現登入時啟動伺服器，請先在 `/etc/wsl.conf` 中啟用 systemd，然後執行
`npx plane mcp boot enable`。
