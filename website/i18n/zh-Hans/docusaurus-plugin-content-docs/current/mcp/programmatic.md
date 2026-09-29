---
sidebar_position: 7
title: 编程方式使用
description: "通过 stdio、Streamable HTTP 或其他任意传输方式，将 Plane MCP 服务器嵌入你自己的进程。"
---

# 编程方式使用

`@hoyasumii/plane/mcp` 把服务器本身也导出了，方便你把它嵌入到自己的进程里。

## stdio

`servePlaneMcpStdio` 会在 stdin/stdout 上说 MCP，就像一个客户端运行它自己启动的服务器那样。一旦连接成
功，它就会 resolve；`closed` 会在客户端关闭 stdin 时 settle。stdout 是协议通道：只向 stderr 写日志。

```ts
import { servePlaneMcpStdio } from "@hoyasumii/plane/mcp";

const stdio = await servePlaneMcpStdio({ baseUrl: "https://api.plane.so", apiKey: "your-api-key" });
await stdio.closed; // 客户端关闭了 stdin
```

选项：`baseUrl`、`apiKey`、`workspace?`（默认工作区），以及用来换成其他流的 `stdin?`/`stdout?`。

## Streamable HTTP

`startPlaneMcpServer` 会以无状态的方式，在 `127.0.0.1` 上提供 Streamable HTTP。一个进程会在每一次请求
之间共享同一个缓存和同一个 API 版本探测结果。

```ts
import { startPlaneMcpServer } from "@hoyasumii/plane/mcp";

const mcp = await startPlaneMcpServer({
  port: 3766,
  baseUrl: "https://api.plane.so",
  apiKey: "your-api-key",
});
console.log(mcp.url); // http://127.0.0.1:3766/mcp
// 之后：await mcp.close();
```

`port: 0` 会挑选一个空闲端口，你可以从 `mcp.port` 把它读回来。这个服务器会：

- 在 `POST /mcp` 上回答 MCP；
- 在 `GET /health` 上回答 `{ "ok": true, "workspace": …, "api": "v1" | "v2" | "unknown" }`；
- 拒绝任何 `Host` 不是 `127.0.0.1`、`localhost` 或 `[::1]` 的请求，以防范 DNS 重绑定攻击；
- 在设置了 `shutdownToken` 时，会在收到带有 `X-Plane-Shutdown: <token>` 请求头的 `POST /shutdown` 时关
  闭（或者调用你的 `onShutdown`）。`plane mcp stop` 就是用的这个机制。

## 任何其他传输方式

`buildPlaneMcpServer(client)` 会返回来自 `@modelcontextprotocol/sdk` 的那个裸 `McpServer`，已经注册好
了每一个工具，但没有附加任何传输方式：

```ts
import { PlaneClient } from "@hoyasumii/plane";
import { buildPlaneMcpServer } from "@hoyasumii/plane/mcp";

const server = buildPlaneMcpServer(new PlaneClient({ apiKey: "your-api-key" }), { workspace: "acme" });
// await server.connect(yourTransport);
```

## 目录（catalog）和 `invoke`

这些通用工具是建立在一些你也可以直接使用的导出之上的：`CATALOG`（每一个 v2 资源和方法）、
`searchCatalog`、`describeMethod`，以及 `invoke(client, resource, method, options)`——它会用具名参数调
用一个目录里的方法，并在没有 `confirm: true` 时拒绝运行一个破坏性方法。

```ts
import { PlaneClient } from "@hoyasumii/plane";
import { invoke } from "@hoyasumii/plane/mcp";

const plane = new PlaneClient({ apiKey: "your-api-key" });
const states = await invoke(plane, "workspaces.projects.states", "list", { args: { slug: "acme", project: "ENG" } });
```
