---
sidebar_position: 7
title: Uso programático
---

# Uso programático

`@hoyasumii/plane/mcp` exporta o próprio servidor, para embuti-lo no seu processo.

## stdio

`servePlaneMcpStdio` fala MCP no stdin/stdout, do jeito que um cliente roda um servidor que ele mesmo iniciou.
Resolve assim que conecta, e `closed` se resolve quando o cliente fecha o stdin. O stdout é o canal do
protocolo: escreva logs só no stderr.

```ts
import { servePlaneMcpStdio } from "@hoyasumii/plane/mcp";

const stdio = await servePlaneMcpStdio({ baseUrl: "https://api.plane.so", apiKey: "your-api-key" });
await stdio.closed; // o cliente fechou o stdin
```

Opções: `baseUrl`, `apiKey`, `workspace?` (o workspace padrão) e `stdin?`/`stdout?` para usar outros streams.

## Streamable HTTP

`startPlaneMcpServer` serve Streamable HTTP em `127.0.0.1`, sem estado. Um processo compartilha um cache e uma
sondagem de versão da API entre todas as requisições.

```ts
import { startPlaneMcpServer } from "@hoyasumii/plane/mcp";

const mcp = await startPlaneMcpServer({
  port: 3766,
  baseUrl: "https://api.plane.so",
  apiKey: "your-api-key",
});
console.log(mcp.url); // http://127.0.0.1:3766/mcp
// depois: await mcp.close();
```

`port: 0` escolhe uma porta livre, que você lê de volta em `mcp.port`. O servidor:

- responde MCP em `POST /mcp`;
- responde `GET /health` com `{ "ok": true, "workspace": …, "api": "v1" | "v2" | "unknown" }`;
- recusa uma requisição cujo `Host` não seja `127.0.0.1`, `localhost` ou `[::1]`, contra DNS rebinding;
- com um `shutdownToken`, fecha num `POST /shutdown` com o header `X-Plane-Shutdown: <token>` (ou chama o seu
  `onShutdown`). É isso que o `plane mcp stop` usa.

## Qualquer outro transporte

`buildPlaneMcpServer(client)` devolve o `McpServer` puro do `@modelcontextprotocol/sdk`, com todas as ferramentas
registradas e nenhum transporte conectado:

```ts
import { PlaneClient } from "@hoyasumii/plane";
import { buildPlaneMcpServer } from "@hoyasumii/plane/mcp";

const server = buildPlaneMcpServer(new PlaneClient({ apiKey: "your-api-key" }), { workspace: "acme" });
// await server.connect(yourTransport);
```

## O catálogo e o `invoke`

As ferramentas genéricas são feitas de exports que você pode usar diretamente: `CATALOG` (todo recurso e método
v2), `searchCatalog`, `describeMethod` e `invoke(client, resource, method, options)`, que chama um método do
catálogo com argumentos nomeados e recusa um método destrutivo sem `confirm: true`.

```ts
import { PlaneClient } from "@hoyasumii/plane";
import { invoke } from "@hoyasumii/plane/mcp";

const plane = new PlaneClient({ apiKey: "your-api-key" });
const states = await invoke(plane, "workspaces.projects.states", "list", { args: { slug: "acme", project: "ENG" } });
```
