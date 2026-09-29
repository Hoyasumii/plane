---
sidebar_position: 7
title: 程式設計方式使用
description: "透過 stdio、Streamable HTTP 或其他任何傳輸方式，將 Plane MCP 伺服器嵌入你自己的行程。"
---

# 程式設計方式使用

`@hoyasumii/plane/mcp` 把伺服器本身也匯出了，方便你把它嵌入到自己的行程裡。

## stdio

`servePlaneMcpStdio` 會在 stdin/stdout 上說 MCP，就像一個客戶端執行它自己啟動的伺服器那樣。一旦連線成
功，它就會 resolve；`closed` 會在客戶端關閉 stdin 時 settle。stdout 是協議通道：只向 stderr 寫日誌。

```ts
import { servePlaneMcpStdio } from "@hoyasumii/plane/mcp";

const stdio = await servePlaneMcpStdio({ baseUrl: "https://api.plane.so", apiKey: "your-api-key" });
await stdio.closed; // 客戶端關閉了 stdin
```

選項：`baseUrl`、`apiKey`、`workspace?`（預設工作區），以及用來換成其他流的 `stdin?`/`stdout?`。

## Streamable HTTP

`startPlaneMcpServer` 會以無狀態的方式，在 `127.0.0.1` 上提供 Streamable HTTP。一個行程會在每一次請求
之間共享同一個快取和同一個 API 版本探測結果。

```ts
import { startPlaneMcpServer } from "@hoyasumii/plane/mcp";

const mcp = await startPlaneMcpServer({
  port: 3766,
  baseUrl: "https://api.plane.so",
  apiKey: "your-api-key",
});
console.log(mcp.url); // http://127.0.0.1:3766/mcp
// 之後：await mcp.close();
```

`port: 0` 會挑選一個空閒埠，你可以從 `mcp.port` 把它讀回來。這個伺服器會：

- 在 `POST /mcp` 上回答 MCP；
- 在 `GET /health` 上回答 `{ "ok": true, "workspace": …, "api": "v1" | "v2" | "unknown" }`；
- 拒絕任何 `Host` 不是 `127.0.0.1`、`localhost` 或 `[::1]` 的請求，以防範 DNS 重繫結攻擊；
- 在設定了 `shutdownToken` 時，會在收到帶有 `X-Plane-Shutdown: <token>` 請求頭的 `POST /shutdown` 時關
  閉（或者呼叫你的 `onShutdown`）。`plane mcp stop` 就是用的這個機制。

## 任何其他傳輸方式

`buildPlaneMcpServer(client)` 會返回來自 `@modelcontextprotocol/sdk` 的那個裸 `McpServer`，已經註冊好
了每一個工具，但沒有附加任何傳輸方式：

```ts
import { PlaneClient } from "@hoyasumii/plane";
import { buildPlaneMcpServer } from "@hoyasumii/plane/mcp";

const server = buildPlaneMcpServer(new PlaneClient({ apiKey: "your-api-key" }), { workspace: "acme" });
// await server.connect(yourTransport);
```

## 目錄（catalog）和 `invoke`

這些通用工具是建立在一些你也可以直接使用的匯出之上的：`CATALOG`（每一個 v2 資源和方法）、
`searchCatalog`、`describeMethod`，以及 `invoke(client, resource, method, options)`——它會用具名引數調
用一個目錄裡的方法，並在沒有 `confirm: true` 時拒絕執行一個破壞性方法。

```ts
import { PlaneClient } from "@hoyasumii/plane";
import { invoke } from "@hoyasumii/plane/mcp";

const plane = new PlaneClient({ apiKey: "your-api-key" });
const states = await invoke(plane, "workspaces.projects.states", "list", { args: { slug: "acme", project: "ENG" } });
```
