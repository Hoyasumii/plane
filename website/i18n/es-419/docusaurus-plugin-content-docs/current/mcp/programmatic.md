---
sidebar_position: 7
title: Uso programático
description: "Integra el servidor MCP de Plane en tu propio proceso, por stdio, Streamable HTTP o cualquier otro transporte."
---

# Uso programático

`@hoyasumii/plane/mcp` exporta el propio servidor, para incrustarlo en tu propio proceso.

## stdio

`servePlaneMcpStdio` habla MCP por stdin/stdout, del modo en que un cliente ejecuta un servidor que él mismo
lanzó. Se resuelve en cuanto se conecta, y `closed` se asienta cuando el cliente cierra stdin. stdout es el
canal del protocolo: registra los logs solo en stderr.

```ts
import { servePlaneMcpStdio } from "@hoyasumii/plane/mcp";

const stdio = await servePlaneMcpStdio({ baseUrl: "https://api.plane.so", apiKey: "your-api-key" });
await stdio.closed; // el cliente cerró stdin
```

Opciones: `baseUrl`, `apiKey`, `workspace?` (el workspace por defecto), y `stdin?`/`stdout?` para usar otros
streams.

## Streamable HTTP

`startPlaneMcpServer` sirve Streamable HTTP en `127.0.0.1`, sin estado. Un proceso comparte una caché y una
sola comprobación de versión de API entre todas las peticiones.

```ts
import { startPlaneMcpServer } from "@hoyasumii/plane/mcp";

const mcp = await startPlaneMcpServer({
  port: 3766,
  baseUrl: "https://api.plane.so",
  apiKey: "your-api-key",
});
console.log(mcp.url); // http://127.0.0.1:3766/mcp
// más adelante: await mcp.close();
```

`port: 0` elige un puerto libre, que puedes leer de vuelta en `mcp.port`. El servidor:

- responde MCP en `POST /mcp`;
- responde `GET /health` con `{ "ok": true, "workspace": …, "api": "v1" | "v2" | "unknown" }`;
- rechaza una petición cuyo `Host` no sea `127.0.0.1`, `localhost` o `[::1]`, contra el DNS rebinding;
- con un `shutdownToken`, se cierra en `POST /shutdown` con la cabecera `X-Plane-Shutdown: <token>` (o llama a
  tu `onShutdown`). `plane mcp stop` usa esto.

## Cualquier otro transporte

`buildPlaneMcpServer(client)` devuelve el `McpServer` puro de `@modelcontextprotocol/sdk`, con cada herramienta
registrada y ningún transporte conectado:

```ts
import { PlaneClient } from "@hoyasumii/plane";
import { buildPlaneMcpServer } from "@hoyasumii/plane/mcp";

const server = buildPlaneMcpServer(new PlaneClient({ apiKey: "your-api-key" }), { workspace: "acme" });
// await server.connect(yourTransport);
```

## El catálogo e `invoke`

Las herramientas genéricas se construyen sobre exports que puedes usar directamente: `CATALOG` (cada recurso y
método v2), `searchCatalog`, `describeMethod`, e `invoke(client, resource, method, options)`, que llama a un
método del catálogo con argumentos con nombre y se niega a ejecutar uno destructivo sin `confirm: true`.

```ts
import { PlaneClient } from "@hoyasumii/plane";
import { invoke } from "@hoyasumii/plane/mcp";

const plane = new PlaneClient({ apiKey: "your-api-key" });
const states = await invoke(plane, "workspaces.projects.states", "list", { args: { slug: "acme", project: "ENG" } });
```
