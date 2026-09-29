---
sidebar_position: 6
title: Konfiguration
description: "Die vier Einstellungen, die der MCP-Server, das Binary plane-mcp und die CLI plane teilen, wo sie gespeichert werden und welche gewinnt."
---

# Konfiguration

Der Server, das `plane-mcp`-Binary und die `plane`-CLI lesen dieselben vier Einstellungen:

| Einstellung       | Flag          | Standard               | Bedeutung                                                               |
| ----------------- | ------------- | ---------------------- | ----------------------------------------------------------------------- |
| `PLANE_API_KEY`   | `--api-key`   | keiner (erforderlich)  | der Plane-API-Schlüssel, gesendet als `X-Api-Key`                       |
| `PLANE_BASE_URL`  | `--base-url`  | `https://api.plane.so` | die Plane-Instanz: Plane Cloud oder deine selbst gehostete URL          |
| `PLANE_WORKSPACE` | `--workspace` | keiner                 | ein Standard-Arbeitsbereich: mit ihm ist `slug` bei jedem Tool optional |
| `PORT`            | `--port`      | `3766`                 | der Port des HTTP-Servers auf `127.0.0.1`                               |

Jede wird aus dem ersten von Folgendem übernommen: ein Flag, die Umgebung, die gespeicherte Datei, der Standard.
Die Auflösung liegt in `resolveMcpConfig` (`src/mcp/config.ts`).

## Die gespeicherte Datei

`plane mcp config` speichert die Einstellungen in einer Pro-Benutzer-`.env`:

| Betriebssystem | Pfad                                                           |
| -------------- | -------------------------------------------------------------- |
| Linux          | `~/.config/plane/.env` (unter Beachtung von `XDG_CONFIG_HOME`) |
| macOS          | `~/Library/Application Support/plane/.env`                     |
| Windows        | `%APPDATA%\plane\.env`                                         |

`PLANE_CONFIG` (oder `--config`) zeigt stattdessen auf eine andere Datei. Die PID-Datei und das Log des
Hintergrundservers liegen in einem `run/`-Ordner daneben.

```text
PLANE_API_KEY=plane_api_0123456789abcdef
PLANE_BASE_URL=https://plane.example.com
PLANE_WORKSPACE=acme
PORT=3766
```

Jeder `plane`-Befehl außer `plane mcp config` und `plane mcp uninstall` verweigert die Ausführung, bis diese
Datei einen API-Schlüssel enthält. Flags und Umgebungsvariablen überschreiben dann die gespeicherten Werte nur
für diesen Lauf. `plane-mcp` und das In-Process-`plane <tool>` lesen ebenfalls die gespeicherte Datei.

Siehe [`plane mcp config`](../cli/mcp-commands.md#plane-mcp-config) für die drei Arten, sie zu schreiben.

## Aus Code

Dieselbe Auflösung wird exportiert, für Tools, die die gespeicherte Konfiguration wiederverwenden wollen:

```ts
import { configFilePath, readEnvFile, resolveMcpConfig, startPlaneMcpServer } from "@hoyasumii/plane/mcp";

const config = resolveMcpConfig({ env: process.env, file: readEnvFile(configFilePath()) });
if (!config.apiKey) throw new Error("run `plane mcp config` first");

const server = await startPlaneMcpServer(config);
console.log(server.url);
```
