---
sidebar_position: 1
title: MCP-Server-Übersicht
description: "Der Plane-MCP-Server: Plane für Claude Code, Codex, OpenCode, Claude Desktop und jeden anderen MCP-Client."
---

# MCP-Server

`@hoyasumii/plane/mcp` macht das SDK zu einem [MCP](https://modelcontextprotocol.io)-Server, sodass Claude Code,
Codex, OpenCode, Claude Desktop oder jeder andere MCP-Client mit Plane arbeiten kann.

## Zwei Transporte

| Transport            | Wer den Server betreibt                                    | Wie man ihn startet                                         |
| -------------------- | ---------------------------------------------------------- | ----------------------------------------------------------- |
| **stdio** (Standard) | der MCP-Client startet `plane-mcp` und besitzt den Prozess | `plane mcp install`, oder `plane-mcp` von Hand registrieren |
| **Streamable HTTP**  | ein langlebiger Server, den sich mehrere Clients teilen    | `plane mcp start`, `plane-mcp --http`, oder aus Code        |

Im stdio-Modus startet der Server mit dem Client und endet, wenn der Client stdin schliesst. stdout trägt das
Protokoll, daher loggt der Server nur nach stderr. Im HTTP-Modus lauscht er nur auf `127.0.0.1`, zustandslos
über Streamable HTTP (`POST /mcp`), und sein Cache wird von jedem verbundenen Client geteilt.

## Drei Arten von Tools

- **[Task-Tools](./task-tools.md)** (`plane_get_issue`, `plane_update_issue`, `plane_add_comment`, …) sind der
  stabile Vertrag, auf den aufgabengetriebene Agenten-Workflows sich verlassen. Sie nehmen Aufgaben per
  Schlüssel (`ACME-130`) und Projekte, Status, Labels und Mitglieder per Name entgegen und liefern lesbare
  Ausgabe ohne IDs. Sie verwenden immer API v1, die sowohl Plane Cloud als auch Self-Hosted-Instanzen bedienen.
- **[Work-Item-Tools](./work-item-tools.md)** (`plane_list_work_items`, `plane_get_work_item`,
  `plane_create_work_item`, `plane_update_work_item`) nutzen API v2, mit ihren Filtern, `fields` und `expand`.
- **[Generische Tools](./generic-tools.md)** (`plane_resources`, `plane_describe`, `plane_call`) erreichen
  jede andere v2-Methode, über alle 90 Ressourcen hinweg.

## Instanzen ohne API v2

Selbst gehostetes Plane 1.4.x antwortet mit 404 auf jede `/api/v2`-Route. Der Server findet das mit einem
einzigen `GET /api/v2/users/me/` heraus, sobald er es zum ersten Mal braucht, und merkt sich die Antwort für die
Lebensdauer des Prozesses. Ein falscher Schlüssel oder ein Netzwerkfehler wird nicht gemerkt. Auf einer solchen
Instanz:

- Die Task-Tools funktionieren wie gewohnt, da sie ohnehin v1 nutzen.
- Die `*_work_item`-Tools antworten über v1 mit denselben Eingaben. Parameter, die nur v2 bedienen kann
  (`cycle_id`, `module_id`, `order_by`, `fields`, `expand`, `type`, `estimate`), schlagen namentlich fehl.
- `plane_resources` und `plane_call` sagen, dass v2 nicht verfügbar ist, und verweisen auf die typisierten
  Tools, statt einen 404 weiterzugeben. `plane_describe` funktioniert weiterhin, da es nur den Katalog liest.

`plane_whoami` meldet, welche API die Instanz bedient (`v1` oder `v2`).

## Nächste Schritte

- [Setup](./setup.md): den Server in deinem MCP-Client registrieren.
- [Konfiguration](./configuration.md): die Einstellungen und wo sie gespeichert werden.
- [Programmatische Nutzung](./programmatic.md): den Server aus eigenem Code starten.
