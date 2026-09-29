---
sidebar_position: 7
title: Utilisation programmatique
description: "Intégrer le serveur MCP de Plane dans votre propre processus, via stdio, Streamable HTTP ou tout autre transport."
---

# Utilisation programmatique

`@hoyasumii/plane/mcp` exporte le serveur lui-même, pour l'intégrer dans votre propre processus.

## stdio

`servePlaneMcpStdio` parle MCP sur stdin/stdout, comme le fait un client qui lance lui-même un serveur. Elle se
résout une fois connectée, et `closed` se règle quand le client ferme stdin. stdout est le canal du protocole :
n'écrivez de journaux que sur stderr.

```ts
import { servePlaneMcpStdio } from "@hoyasumii/plane/mcp";

const stdio = await servePlaneMcpStdio({ baseUrl: "https://api.plane.so", apiKey: "your-api-key" });
await stdio.closed; // le client a fermé stdin
```

Options : `baseUrl`, `apiKey`, `workspace?` (l'espace de travail par défaut), et `stdin?`/`stdout?` pour
utiliser d'autres flux.

## Streamable HTTP

`startPlaneMcpServer` sert Streamable HTTP sur `127.0.0.1`, sans état. Un processus partage un cache et une
sonde de version d'API pour chaque requête.

```ts
import { startPlaneMcpServer } from "@hoyasumii/plane/mcp";

const mcp = await startPlaneMcpServer({
  port: 3766,
  baseUrl: "https://api.plane.so",
  apiKey: "your-api-key",
});
console.log(mcp.url); // http://127.0.0.1:3766/mcp
// plus tard : await mcp.close();
```

`port: 0` choisit un port libre, que vous pouvez relire depuis `mcp.port`. Le serveur :

- répond à MCP sur `POST /mcp` ;
- répond à `GET /health` avec `{ "ok": true, "workspace": …, "api": "v1" | "v2" | "unknown" }` ;
- refuse une requête dont le `Host` n'est pas `127.0.0.1`, `localhost` ou `[::1]`, contre le DNS rebinding ;
- avec un `shutdownToken`, se ferme sur `POST /shutdown` portant l'en-tête `X-Plane-Shutdown: <token>` (ou
  appelle votre `onShutdown`). `plane mcp stop` utilise ceci.

## Tout autre transport

`buildPlaneMcpServer(client)` renvoie le `McpServer` nu de `@modelcontextprotocol/sdk`, avec chaque outil
enregistré et aucun transport attaché :

```ts
import { PlaneClient } from "@hoyasumii/plane";
import { buildPlaneMcpServer } from "@hoyasumii/plane/mcp";

const server = buildPlaneMcpServer(new PlaneClient({ apiKey: "your-api-key" }), { workspace: "acme" });
// await server.connect(yourTransport);
```

## Le catalogue et `invoke`

Les outils génériques sont construits sur des exports que vous pouvez utiliser directement : `CATALOG`
(chaque ressource et méthode v2), `searchCatalog`, `describeMethod`, et `invoke(client, resource, method, options)`,
qui appelle une méthode du catalogue avec des arguments nommés et refuse une méthode destructive sans
`confirm: true`.

```ts
import { PlaneClient } from "@hoyasumii/plane";
import { invoke } from "@hoyasumii/plane/mcp";

const plane = new PlaneClient({ apiKey: "your-api-key" });
const states = await invoke(plane, "workspaces.projects.states", "list", { args: { slug: "acme", project: "ENG" } });
```
