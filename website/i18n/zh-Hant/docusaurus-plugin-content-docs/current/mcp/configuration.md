---
sidebar_position: 6
title: 配置
description: "MCP 伺服器、plane-mcp 執行檔與 plane CLI 共用的四項設定：儲存位置與優先順序。"
---

# 配置

伺服器、`plane-mcp` 這個 bin 和 `plane` 這個 CLI 讀取的是同樣的四項設定：

| 設定              | 標誌位        | 預設值                 | 含義                                                   |
| ----------------- | ------------- | ---------------------- | ------------------------------------------------------ |
| `PLANE_API_KEY`   | `--api-key`   | 無（必需）             | Plane 的 API 金鑰，作為 `X-Api-Key` 傳送               |
| `PLANE_BASE_URL`  | `--base-url`  | `https://api.plane.so` | 這個 Plane 例項：Plane Cloud，或者你自託管的 URL       |
| `PLANE_WORKSPACE` | `--workspace` | 無                     | 一個預設工作區：有了它，每個工具的 `slug` 都變成可選的 |
| `PORT`            | `--port`      | `3766`                 | HTTP 伺服器在 `127.0.0.1` 上監聽的埠                   |

每一項都會按照下面的順序，取第一個有值的來源：一個標誌位、環境變數、已儲存的檔案、預設值。這個解析過程
位於 `resolveMcpConfig`（`src/mcp/config.ts`）中。

## 已儲存的檔案

`plane mcp config` 會把設定儲存到一個按使用者區分的 `.env` 檔案裡：

| 作業系統 | 路徑                                             |
| -------- | ------------------------------------------------ |
| Linux    | `~/.config/plane/.env`（尊重 `XDG_CONFIG_HOME`） |
| macOS    | `~/Library/Application Support/plane/.env`       |
| Windows  | `%APPDATA%\plane\.env`                           |

`PLANE_CONFIG`（或者 `--config`）可以指向另一個檔案。後臺伺服器的 pid 檔案和日誌就存放在它旁邊的一個
`run/` 資料夾裡。

```text
PLANE_API_KEY=plane_api_0123456789abcdef
PLANE_BASE_URL=https://plane.example.com
PLANE_WORKSPACE=acme
PORT=3766
```

除了 `plane mcp config` 和 `plane mcp uninstall` 之外，每一個 `plane` 命令在這個檔案持有一個 API 金鑰
之前都會拒絕執行。此後，標誌位和環境變數只會在這一次執行中覆蓋已儲存的值。`plane-mcp` 以及行程內執行的
`plane <tool>` 也都會讀取這個已儲存的檔案。

三種寫入它的方式請參見 [`plane mcp config`](../cli/mcp-commands.md#plane-mcp-config)。

## 從程式碼中使用

同樣的解析邏輯也被匯出了，方便想要複用已儲存配置的工具使用：

```ts
import { configFilePath, readEnvFile, resolveMcpConfig, startPlaneMcpServer } from "@hoyasumii/plane/mcp";

const config = resolveMcpConfig({ env: process.env, file: readEnvFile(configFilePath()) });
if (!config.apiKey) throw new Error("run `plane mcp config` first");

const server = await startPlaneMcpServer(config);
console.log(server.url);
```
