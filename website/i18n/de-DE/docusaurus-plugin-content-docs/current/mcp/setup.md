---
sidebar_position: 2
title: Setup
description: "Einstellungen einmal speichern und den Plane-MCP-Server in Claude Code, Codex und OpenCode registrieren."
---

# Setup

## Der schnelle Weg

Speichere deine Einstellungen einmal und lass die CLI den Server in den gefundenen Clients registrieren:

```bash
npx plane mcp config    # fragt nach dem API-Schlüssel, der Instanz-URL, einem Standard-Workspace und einem Port
npx plane mcp install   # findet Claude Code, Codex und OpenCode in deinem PATH und registriert plane-mcp (stdio)
```

`install` zeigt eine Checkliste der gefundenen Clients. Hake die aus, die du willst, und es registriert den
Server über die eigene CLI jedes Clients, unter dem Namen `plane`. Der registrierte Befehl liest die gespeicherte
Konfiguration, wenn der Client ihn startet, sodass kein API-Schlüssel in der Konfiguration des Clients landet.
Siehe [`plane mcp install`](../cli/mcp-commands.md#plane-mcp-install) für die Flags.

## Von Hand: stdio

Lass den Client `plane-mcp` starten. Er liest die gespeicherte Konfiguration, sodass die Client-Konfiguration
keine Schlüssel braucht:

```json
{
  "mcpServers": {
    "plane": { "command": "npx", "args": ["-y", "-p", "@hoyasumii/plane", "plane-mcp"] }
  }
}
```

In Claude Code:

```bash
claude mcp add plane -- npx -y -p @hoyasumii/plane plane-mcp
```

Ohne gespeicherte Konfiguration, oder um sie zu überschreiben, gib dem Client einen `env`-Block mit
`PLANE_API_KEY`, `PLANE_BASE_URL` und `PLANE_WORKSPACE`:

```json
{
  "mcpServers": {
    "plane": {
      "command": "npx",
      "args": ["-y", "-p", "@hoyasumii/plane", "plane-mcp"],
      "env": { "PLANE_API_KEY": "your-api-key", "PLANE_WORKSPACE": "acme" }
    }
  }
}
```

## Von Hand: HTTP

Lass einen Server im Hintergrund laufen und zeige mit deinen Clients auf seine URL:

```bash
npx plane mcp start          # gibt die URL aus, standardmäßig http://127.0.0.1:3766/mcp
claude mcp add --transport http plane http://127.0.0.1:3766/mcp
```

Ohne die CLI: `PORT=3766 PLANE_BASE_URL=... PLANE_API_KEY=... npx plane-mcp --http` lässt ihn im Vordergrund
laufen. `plane-mcp --help` listet die Flags auf. Um den Server bei jedem Login zu starten, führe
`npx plane mcp boot enable` aus (siehe [`plane mcp boot`](../cli/mcp-commands.md#plane-mcp-boot)).

## Prüfen, dass es funktioniert

Lass deinen Agenten `plane_whoami` aufrufen, oder führe es aus dem Terminal aus:

```bash
npx plane whoami
```

Es antwortet mit dem Benutzer des Schlüssels, dem Standard-Arbeitsbereich, der Basis-URL und der API, die die
Instanz bedient.
