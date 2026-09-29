---
sidebar_position: 4
title: Work-Item-Tools
description: "Vier typisierte MCP-Tools für Work Items über API v2, mit deren Filtern, fields und expand."
---

# Work-Item-Tools

Vier typisierte Tools decken Work Items über API v2 ab, mit den Filtern, `fields` und `expand` von v2. Sie
liegen in `src/mcp/tools/curated.ts`. Alles andere läuft über die [generischen Tools](./generic-tools.md).

| Tool                     | Was es tut                                                                             |
| ------------------------ | -------------------------------------------------------------------------------------- |
| `plane_list_work_items`  | Work Items in einem Projekt, oder über den ganzen Arbeitsbereich, wenn `project` fehlt |
| `plane_get_work_item`    | ein Work Item, per Bezeichner (`ENG-123`) oder per UUID plus `project`                 |
| `plane_create_work_item` | erstellt ein Work Item in einem Projekt                                                |
| `plane_update_work_item` | ändert die angegebenen Felder und sendet nur diese                                     |

`slug` ist erforderlich, sofern kein Standard-Arbeitsbereich konfiguriert ist. `project` ist eine Projekt-UUID
oder ihr Bezeichner (`ENG`), und `workItem` ein Bezeichner wie `ENG-123` oder eine UUID. Mit einem Bezeichner
wird kein Projekt benötigt: Er wird über das arbeitsbereichsweite Lookup aufgelöst.

## `plane_list_work_items`

| Eingabe        | Bedeutung                                                                 |
| -------------- | ------------------------------------------------------------------------- |
| `project?`     | ein Projekt; fehlt es, der ganze Arbeitsbereich                           |
| `search?`      | Freitextsuche                                                             |
| `state_id?`    | ein Status                                                                |
| `state_group?` | `backlog`, `unstarted`, `started`, `completed`, `cancelled` oder `triage` |
| `assignee_id?` | ein Zuständiger                                                           |
| `label_id?`    | ein Label                                                                 |
| `priority?`    | `none`, `low`, `medium`, `high` oder `urgent`                             |
| `cycle_id?`    | ein Cycle                                                                 |
| `module_id?`   | ein Modul                                                                 |
| `order_by?`    | eine Sortierreihenfolge, z. B. `-updated_at`                              |
| `fields?`      | nur diese Felder, z. B. `["name", "state_id"]`                            |
| `per_page?`    | Seitengrösse, 1–100                                                       |
| `offset?`      | zu überspringende Zeilen, für die nächste Seite                           |

Für die Filter, die diese Eingaben nicht abdecken, führe `plane_describe` für `workspaces.projects.workItems`
`list` aus.

## `plane_get_work_item`

`workItem`, plus `project` (nur wenn `workItem` eine UUID ist) und `expand` (verwandte Objekte, die eingefügt
werden sollen, z. B. `["state", "labels"]`).

## `plane_create_work_item` und `plane_update_work_item`

Beide nehmen `project` (create) oder `workItem` (update) entgegen, dann die Felder des Work Items. `name` ist
beim Erstellen erforderlich.

| Feld                         | Bedeutung                                                        |
| ---------------------------- | ---------------------------------------------------------------- |
| `name`                       | der Titel                                                        |
| `description_html`           | die Beschreibung als HTML, z. B. `<p>text</p>`                   |
| `state` / `state_id`         | ein Statusname (`In Progress`) oder seine ID                     |
| `priority`                   | `none`, `low`, `medium`, `high` oder `urgent`                    |
| `assignees` / `assignee_ids` | E-Mails der Zuständigen oder ihre IDs                            |
| `labels` / `label_ids`       | Labelnamen oder ihre IDs                                         |
| `parent`                     | der Bezeichner oder die ID des übergeordneten Work Items         |
| `type`                       | ein Work-Item-Typname                                            |
| `start_date` / `target_date` | `YYYY-MM-DD`; das Zieldatum darf nicht vor dem Startdatum liegen |
| `estimate`                   | ein Schätzwert                                                   |
| `cycle_id`                   | eine Cycle-ID, oder `null`                                       |

## Auf einer Instanz ohne API v2

Auf selbst gehostetem Plane 1.4.x antworten diese vier Tools über v1 (`src/mcp/tools/work-items-v1.ts`) mit
denselben Eingaben. Die Parameter, die nur v2 bedienen kann (`cycle_id`, `module_id`, `order_by`, `fields`,
`expand`, `type`, `estimate`), schlagen namentlich fehl, statt ignoriert zu werden.
