---
sidebar_position: 1
title: Erste Schritte
description: "Ein TypeScript-SDK für die Plane-API, mit einem MCP-Server und einer CLI darauf: was jeder Teil tut und wie du ihn installierst."
slug: /intro
---

# Erste Schritte

`@hoyasumii/plane` ist ein TypeScript-SDK für die [Plane](https://plane.so)-API, mit einem MCP-Server und einer
CLI, die darauf aufbauen. Nutze es aus Code, aus einem KI-Agenten oder aus deinem Terminal: alle drei teilen sich
denselben Client.

- **SDK**: ein typisierter Client für die API v1 und die gesamte v2-Oberfläche (`client.v2`, 90 Ressourcen).
  `fields` schränkt den Rückgabetyp zur Compile-Zeit ein, und geladene Zeilen lassen sich zu ihren Kindern
  navigieren. Beginne bei [API v2](./sdk/v2/overview.md).
- **MCP-Server** (`@hoyasumii/plane/mcp`): stdio oder Streamable HTTP. Er hat Task-Tools, die mit Schlüsseln und
  Namen arbeiten (`ACME-130`, `"Todo"`, `"me"`), und generische Tools, die jede v2-Methode erreichen.
  Beginne bei [MCP-Server](./mcp/overview.md).
- **CLI** (`plane`): jedes MCP-Tool als Unterbefehl, plus `plane mcp`, um den Server zu konfigurieren, ihn im
  Hintergrund laufen zu lassen, ihn beim Login zu starten und ihn in Claude Code, Codex und OpenCode zu
  registrieren. Beginne bei [CLI](./cli/overview.md).

Es funktioniert mit Plane Cloud und mit selbst gehosteten Instanzen, einschliesslich selbst gehosteter 1.4.x-
Instanzen, die keine API v2 haben.

## Installation

Erfordert Node.js 20 oder neuer.

```bash
npm install @hoyasumii/plane
# oder
pnpm add @hoyasumii/plane
```

## Schnellstart

Erstelle einen Client mit einem API-Schlüssel (Plane → Arbeitsbereichseinstellungen → API-Tokens) oder mit einem
OAuth-Access-Token. `baseUrl` verwendet standardmässig Plane Cloud (`https://api.plane.so`); zeige beim
Self-Hosting auf deine eigene Instanz.

```ts
import { PlaneClient } from "@hoyasumii/plane";

const client = new PlaneClient({ apiKey: "your-api-key" });

// API v2: Pfad-IDs sind positionell und stehen vorn, in URL-Reihenfolge.
const states = await client.v2.workspaces.projects.states.list("acme", "ENG");

// Eine geladene Zeile trägt ihre IDs, ihre Kinder brauchen also keine.
const eng = await client.v2.workspaces.projects.retrieve("acme", "ENG");
await eng.workItems.create({ name: "Fix login bug", state: "Todo", labels: ["bug"] });

// API v1 hängt ebenfalls am Client.
const projects = await client.projects.list("acme");
```

## Verwendung aus einem KI-Agenten

Speichere deine Einstellungen einmal und registriere den MCP-Server in den auf deinem Rechner installierten
Clients:

```bash
npx plane mcp config    # fragt nach dem API-Schlüssel, der Instanz-URL und einem Standard-Workspace
npx plane mcp install   # registriert plane-mcp in Claude Code, Codex und OpenCode
```

[MCP-Setup](./mcp/setup.md) behandelt die manuelle Konfiguration und den HTTP-Transport.

## Verwendung aus dem Terminal

Nach `plane mcp config` ist jedes MCP-Tool ein Befehl:

```bash
npx plane whoami
npx plane list-my-issues
npx plane get-issue --key ACME-14
```

Siehe [CLI](./cli/overview.md).
