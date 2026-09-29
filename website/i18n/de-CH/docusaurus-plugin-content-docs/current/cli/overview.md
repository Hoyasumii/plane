---
sidebar_position: 1
title: CLI-Übersicht
description: "Der Befehl plane: jedes MCP-Tool als Unterbefehl, mit dem Eingabeschema des Tools als Flags."
---

# CLI

Das Paket installiert einen `plane`-Befehl. Er ist ein MCP-Client desselben [Servers](../mcp/overview.md): jedes
MCP-Tool wird zu einem Unterbefehl, und das Eingabeschema des Tools wird zu seinen Flags. Standardmässig läuft
der Server innerhalb des Befehls, sodass nichts zuerst gestartet werden muss.

```bash
npx plane mcp config                 # einmalig: den API-Schlüssel speichern (PLANE_BASE_URL ist standardmässig https://api.plane.so)
npx plane tools                      # alle Befehle, einer pro MCP-Tool
npx plane whoami
npx plane get-issue --key ACME-14
npx plane list-my-issues --project ACME
npx plane list-work-items --slug acme --project ENG --per-page 20 --fields name,state_id
npx plane get-work-item --slug acme --work-item ENG-123
npx plane resources --query cycle
npx plane describe --resource workspaces.projects.cycles --method delete
npx plane call --resource workspaces.projects.cycles --method delete \
  --args '{"slug":"acme","project":"ENG","cycle":"<cycle-id>"}' --confirm
```

Ausser `--help`, `--version` und `plane docs` läuft nichts, bis `plane mcp config` eine Konfiguration mit einem
API-Schlüssel gespeichert hat. `plane docs` gibt den Link zu dieser Website aus und öffnet sie im Browser.

## Von Tools zu Befehlen

- Der Befehl ist der Name des Tools ohne `plane_`, in Kebab-Case: `plane_list_work_items` → `list-work-items`.
- Jedes Flag ist eine Eingabe in Kebab-Case: `per_page` → `--per-page`, `workItem` → `--work-item`.
- Array-Flags nehmen `a,b` oder JSON, Objekt-Flags nehmen JSON, und boolesche Flags brauchen keinen Wert.
- `plane <command> --help` listet die Flags eines Befehls auf, mit den erlaubten Werten von Enum-Eingaben.

Die Ausgabe eines Tools geht nach stdout. Ein Tool-Fehler geht nach stderr mit Exit-Code 1.

## Mit einem laufenden Server sprechen

Um einen bereits über HTTP laufenden `plane-mcp` statt des In-Process-Servers zu nutzen, übergib
`--url http://127.0.0.1:3766/mcp` oder setze `PLANE_MCP_URL`. `--base-url` und `--api-key` überschreiben die
Umgebung und die gespeicherte Datei für den In-Process-Server.

Keines dieser Flags ersetzt die gespeicherte Konfiguration: Die CLI verweigert das Ausführen von Tools ohne
sie, selbst wenn `--url` oder `--api-key` angegeben ist.

## Den Server verwalten

`plane mcp` wird vor jeder Verbindung abgefangen. Er konfiguriert den Server, lässt ihn im Hintergrund laufen,
startet ihn beim Login und registriert ihn in deinen MCP-Clients. Siehe [`plane mcp`](./mcp-commands.md).
