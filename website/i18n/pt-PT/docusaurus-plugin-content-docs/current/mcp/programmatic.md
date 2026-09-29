---
sidebar_position: 7
title: Utilização programática
description: "Incorpore o servidor MCP do Plane no seu próprio processo, via stdio, Streamable HTTP ou qualquer outro transporte."
---

# Utilização programática

`@hoyasumii/plane/mcp` exporta o próprio servidor, para o incorporar no seu processo.

## stdio

`servePlaneMcpStdio` fala MCP no stdin/stdout, da mesma forma que um cliente executa um servidor que ele próprio
iniciou. Resolve-se logo que se liga, e `closed` resolve-se quando o cliente fecha o stdin. O stdout é o canal
do protocolo: escreva os registos apenas no stderr.

```ts
import { servePlaneMcpStdio } from "@hoyasumii/plane/mcp";

const stdio = await servePlaneMcpStdio({ baseUrl: "https://api.plane.so", apiKey: "your-api-key" });
await stdio.closed; // o cliente fechou o stdin
```

Opções: `baseUrl`, `apiKey`, `workspace?` (o workspace predefinido), e `stdin?`/`stdout?` para usar outros
streams.

## Streamable HTTP

`startPlaneMcpServer` serve Streamable HTTP em `127.0.0.1`, sem estado. Um processo partilha uma cache e uma
sondagem de versão da API entre todos os pedidos.

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

`port: 0` escolhe uma porta livre, que pode ser consultada depois em `mcp.port`. O servidor:

- responde a MCP em `POST /mcp`;
- responde a `GET /health` com `{ "ok": true, "workspace": …, "api": "v1" | "v2" | "unknown" }`;
- recusa um pedido cujo `Host` não seja `127.0.0.1`, `localhost` ou `[::1]`, contra DNS rebinding;
- com um `shutdownToken`, fecha num `POST /shutdown` com o cabeçalho `X-Plane-Shutdown: <token>` (ou chama o seu
  `onShutdown`). É isto que o `plane mcp stop` usa.

## Qualquer outro transporte

`buildPlaneMcpServer(client)` devolve o `McpServer` puro do `@modelcontextprotocol/sdk`, com todas as
ferramentas registadas e nenhum transporte ligado:

```ts
import { PlaneClient } from "@hoyasumii/plane";
import { buildPlaneMcpServer } from "@hoyasumii/plane/mcp";

const server = buildPlaneMcpServer(new PlaneClient({ apiKey: "your-api-key" }), { workspace: "acme" });
// await server.connect(yourTransport);
```

## O catálogo e o `invoke`

As ferramentas genéricas são construídas sobre exports que pode utilizar diretamente: `CATALOG` (todos os
recursos e métodos v2), `searchCatalog`, `describeMethod` e `invoke(client, resource, method, options)`, que
chama um método do catálogo com argumentos nomeados e recusa um método destrutivo sem `confirm: true`.

```ts
import { PlaneClient } from "@hoyasumii/plane";
import { invoke } from "@hoyasumii/plane/mcp";

const plane = new PlaneClient({ apiKey: "your-api-key" });
const states = await invoke(plane, "workspaces.projects.states", "list", { args: { slug: "acme", project: "ENG" } });
```
