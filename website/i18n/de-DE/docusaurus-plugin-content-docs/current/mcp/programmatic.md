---
sidebar_position: 7
title: Programmatische Nutzung
description: "Den Plane-MCP-Server in den eigenen Prozess einbetten, über stdio, Streamable HTTP oder jeden anderen Transport."
---

# Programmatische Nutzung

`@hoyasumii/plane/mcp` exportiert den Server selbst, um ihn in deinen eigenen Prozess einzubetten.

## stdio

`servePlaneMcpStdio` spricht MCP über stdin/stdout, so wie ein Client einen selbst gestarteten Server betreibt.
Es löst sich auf, sobald verbunden, und `closed` erfüllt sich, wenn der Client stdin schließt. stdout ist der
Protokollkanal: logge nur nach stderr.

```ts
import { servePlaneMcpStdio } from "@hoyasumii/plane/mcp";

const stdio = await servePlaneMcpStdio({ baseUrl: "https://api.plane.so", apiKey: "your-api-key" });
await stdio.closed; // der Client hat stdin geschlossen
```

Optionen: `baseUrl`, `apiKey`, `workspace?` (der Standard-Arbeitsbereich) und `stdin?`/`stdout?`, um andere
Streams zu verwenden.

## Streamable HTTP

`startPlaneMcpServer` bedient Streamable HTTP auf `127.0.0.1`, zustandslos. Ein Prozess teilt sich einen Cache
und eine API-Versionsprüfung über jede Anfrage hinweg.

```ts
import { startPlaneMcpServer } from "@hoyasumii/plane/mcp";

const mcp = await startPlaneMcpServer({
  port: 3766,
  baseUrl: "https://api.plane.so",
  apiKey: "your-api-key",
});
console.log(mcp.url); // http://127.0.0.1:3766/mcp
// später: await mcp.close();
```

`port: 0` wählt einen freien Port, den du über `mcp.port` zurücklesen kannst. Der Server:

- beantwortet MCP auf `POST /mcp`;
- beantwortet `GET /health` mit `{ "ok": true, "workspace": …, "api": "v1" | "v2" | "unknown" }`;
- verweigert eine Anfrage, deren `Host` nicht `127.0.0.1`, `localhost` oder `[::1]` ist, gegen DNS-Rebinding;
- schließt mit einem `shutdownToken` bei `POST /shutdown` mit dem Header `X-Plane-Shutdown: <token>` (oder ruft
  dein `onShutdown` auf). `plane mcp stop` nutzt das.

## Jeder andere Transport

`buildPlaneMcpServer(client)` gibt den nackten `McpServer` aus `@modelcontextprotocol/sdk` zurück, mit jedem
registrierten Tool und ohne angehängten Transport:

```ts
import { PlaneClient } from "@hoyasumii/plane";
import { buildPlaneMcpServer } from "@hoyasumii/plane/mcp";

const server = buildPlaneMcpServer(new PlaneClient({ apiKey: "your-api-key" }), { workspace: "acme" });
// await server.connect(yourTransport);
```

## Der Katalog und `invoke`

Die generischen Tools sind auf Exporten aufgebaut, die du direkt nutzen kannst: `CATALOG` (jede v2-Ressource
und -Methode), `searchCatalog`, `describeMethod` und `invoke(client, resource, method, options)`, das eine
Katalogmethode mit benannten Argumenten aufruft und eine destruktive ohne `confirm: true` verweigert.

```ts
import { PlaneClient } from "@hoyasumii/plane";
import { invoke } from "@hoyasumii/plane/mcp";

const plane = new PlaneClient({ apiKey: "your-api-key" });
const states = await invoke(plane, "workspaces.projects.states", "list", { args: { slug: "acme", project: "ENG" } });
```
