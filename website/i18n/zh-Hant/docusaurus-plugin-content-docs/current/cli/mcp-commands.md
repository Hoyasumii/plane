---
sidebar_position: 2
title: plane mcp
description: "plane mcp：儲存設定、在背景執行伺服器、登入時自動啟動，並將其註冊到你的 MCP 用戶端。"
---

# `plane mcp`

`plane mcp` 幫你管理 MCP 伺服器：它的已儲存配置、一個後臺 HTTP 伺服器、一個登入服務，以及它在你的 MCP
客戶端裡的註冊情況。

```bash
npx plane mcp config                 # 在終端裡詢問各項設定並儲存它們
npx plane mcp config --workspace acme --port 4000   # 不詢問（指令碼、CI 場景）：只儲存這些，其餘保持不變
npx plane mcp config --web           # 同樣的效果，透過一個本地網頁表單完成
npx plane mcp install                # 挑選 Claude Code / Codex / OpenCode，並在其中註冊 plane-mcp（stdio）
npx plane mcp install --client claude,opencode --force   # 不彈出選擇器（指令碼、CI 場景）；--force 會替換已有條目
npx plane mcp uninstall              # 挑選要移除 'plane' 條目的客戶端（不需要已儲存的配置）
npx plane mcp start                  # 在後臺啟動（需要已儲存的配置）；列印出用於 `claude mcp add` 的 URL
npx plane mcp start --api-key other --port 4000   # 一次性的值，絕不會被儲存
npx plane mcp status                 # 正在執行還是已停止（退出碼 3）、URL、pid、執行時長
npx plane mcp stop
npx plane mcp boot enable            # 每次登入時啟動；`boot disable` / `boot status`
```

## `plane mcp config`

寫入已儲存的 `.env` 檔案（[配置](../mcp/configuration.md)）。它有三種工作方式：

- **在終端中**（預設方式）。它會依次詢問每一項設定，從已儲存的值開始。金鑰會以掩碼方式輸入，直接按回
  車則保留已儲存的那個。對於其他設定，清空這一行（Ctrl+U）可以回到預設值。
- **用標誌位。** 給出 `--api-key`、`--base-url`、`--workspace` 或 `--port` 中的任意一個，它就什麼都不
  問，只儲存這些（`--workspace=` 會清除這一項）。沒有終端時，它需要這些標誌位。把金鑰作為標誌位傳入會
  留在你的 shell 歷史裡，所以更推薦用互動式提示來輸入它。
- **在一個網頁表單裡**，用 `--web`：一個本地頁面，會在瀏覽器裡開啟（`--no-open` 則只列印它的 URL）。

如果有一個伺服器正在執行，它會被告知要重啟以應用這些更改。`--config <file>`（或者 `PLANE_CONFIG`）會
寫入另一個檔案。

## `plane mcp install`

透過執行每個客戶端的 `--version` 來檢測它，並透過該客戶端自己的 CLI，以 `plane` 這個名字註冊這個 stdio
伺服器：

| 客戶端      | 它執行的命令                |
| ----------- | --------------------------- |
| Claude Code | `claude mcp add -s user`    |
| Codex       | `codex mcp add`             |
| OpenCode    | `opencode mcp add --global` |

被註冊的命令是按絕對路徑寫的 `node <package>/dist/mcp/cli.js`，不帶任何 API 金鑰：伺服器會在客戶端啟動
它的時候讀取已儲存的檔案（只有在給了 `--config` 來指定另一個檔案時，才會傳遞 `PLANE_CONFIG`）。

每一個被找到的客戶端預設都是勾選狀態的。一個已經有 `plane` 條目的客戶端會被標記為
`already installed, reinstalls`，並會被替換掉。在沒有互動式終端的情況下，`--client` 是必需的
（`claude`、`codex`、`opencode`；在 WSL 內部還有 `claude@windows`、`codex@windows`、
`opencode@windows`），並且需要加上 `--force` 才能替換一個已有條目。`--dry-run` 會列印出這些命令，而不
是真正執行它們。

`install` 和 `uninstall` 都只作用於每個客戶端的使用者級（全域性）配置。專案範圍內的條目永遠不會被改動。

## `plane mcp uninstall`

列出帶有 `plane` 條目的客戶端，顯示它是 `stdio` 還是 `http`，並移除任何這個名字的條目：
`claude mcp remove -s user`、`codex mcp remove`，以及對於 OpenCode（它沒有 `remove`）——對它的全域性配置
檔案做一次編輯，只刪除那一個鍵，保留其餘的註釋和格式。

除了 `plane mcp config` 之外，它是唯一一個不需要已儲存配置就能執行的命令，這樣即便配置已經不在了，也
可以清理某個客戶端。`--client` 和 `--dry-run` 的用法和 `install` 中一樣。

## `plane mcp start`、`stop` 和 `status`

`start` 會以分離（detached）方式執行這個 HTTP 伺服器，並列印出它的 URL、它的日誌檔案，以及用來註冊它
的那條 `claude mcp add` 命令。它需要一份已儲存的配置。`--api-key`、`--base-url`、`--workspace` 和
`--port` 只會為這一次執行覆蓋它，並且絕不會被儲存。`--foreground` 會改為在當前行程裡提供服務。

`status` 會列印出這個伺服器是否在執行，包括它的 URL、pid 和執行時長，如果沒有在執行，則以退出碼 3 退
出。`stop` 會透過一個有權杖保護的 `POST /shutdown` 請求，來要求伺服器關閉；只有在這樣做失敗時，才會向
這個行程傳送訊號。

## `plane mcp boot`

`boot enable` 會安裝一個屬於當前使用者的服務，讓它在每次登入時啟動這個伺服器，因此不需要 sudo：

| 作業系統 | 服務                                                                        |
| -------- | --------------------------------------------------------------------------- |
| Linux    | 一個 systemd 使用者單元（在 WSL 上，需要在 `/etc/wsl.conf` 裡啟用 systemd） |
| macOS    | 一個 LaunchAgent                                                            |
| Windows  | 一個登入任務（logon task）                                                  |

這個服務只會讀取已儲存的配置。`boot disable` 會移除它，`boot status` 會報告它的狀態。
