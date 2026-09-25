---
sidebar_position: 7
title: Programmatic use
---

# Programmatic use

`@hoyasumii/plane/mcp` exports the server itself, for embedding it in your own process.

## stdio

`servePlaneMcpStdio` speaks MCP on stdin/stdout, the way a client runs a server it launched itself. It resolves
once connected, and `closed` settles when the client closes stdin. stdout is the protocol channel: log to stderr
only.

```ts
import { servePlaneMcpStdio } from "@hoyasumii/plane/mcp";

const stdio = await servePlaneMcpStdio({ baseUrl: "https://api.plane.so", apiKey: "your-api-key" });
await stdio.closed; // the client closed stdin
```

Options: `baseUrl`, `apiKey`, `workspace?` (the default workspace), and `stdin?`/`stdout?` to use other
streams.

## Streamable HTTP

`startPlaneMcpServer` serves Streamable HTTP on `127.0.0.1`, statelessly. One process shares one cache and one
API-version probe across every request.

```ts
import { startPlaneMcpServer } from "@hoyasumii/plane/mcp";

const mcp = await startPlaneMcpServer({
  port: 3766,
  baseUrl: "https://api.plane.so",
  apiKey: "your-api-key",
});
console.log(mcp.url); // http://127.0.0.1:3766/mcp
// later: await mcp.close();
```

`port: 0` picks a free port, which you can read back from `mcp.port`. The server:

- answers MCP on `POST /mcp`;
- answers `GET /health` with `{ "ok": true, "workspace": …, "api": "v1" | "v2" | "unknown" }`;
- refuses a request whose `Host` is not `127.0.0.1`, `localhost` or `[::1]`, against DNS rebinding;
- with a `shutdownToken`, closes on `POST /shutdown` carrying the header `X-Plane-Shutdown: <token>` (or calls
  your `onShutdown`). `plane mcp stop` uses this.

## Any other transport

`buildPlaneMcpServer(client)` returns the bare `McpServer` from `@modelcontextprotocol/sdk`, with every tool
registered and no transport attached:

```ts
import { PlaneClient } from "@hoyasumii/plane";
import { buildPlaneMcpServer } from "@hoyasumii/plane/mcp";

const server = buildPlaneMcpServer(new PlaneClient({ apiKey: "your-api-key" }), { workspace: "acme" });
// await server.connect(yourTransport);
```

## The catalog and `invoke`

The generic tools are built on exports you can use directly: `CATALOG` (every v2 resource and method),
`searchCatalog`, `describeMethod`, and `invoke(client, resource, method, options)`, which calls a catalog method
with named arguments and refuses a destructive one without `confirm: true`.

```ts
import { PlaneClient } from "@hoyasumii/plane";
import { invoke } from "@hoyasumii/plane/mcp";

const plane = new PlaneClient({ apiKey: "your-api-key" });
const states = await invoke(plane, "workspaces.projects.states", "list", { args: { slug: "acme", project: "ENG" } });
```
