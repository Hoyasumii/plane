---
sidebar_position: 3
title: Task-Tools
description: "Die MCP-Task-Tools: Tasks über ihren Schlüssel, Projekte, Status, Labels und Mitglieder über ihren Namen, mit lesbarer Ausgabe."
---

# Task-Tools

Diese Tools sind der stabile Vertrag, auf den aufgabengetriebene Agenten-Workflows sich verlassen. Sie nehmen
Aufgaben per Schlüssel (`ACME-130`) und Projekte, Status, Labels und Mitglieder per Name entgegen und liefern
lesbare Ausgabe ohne IDs. Sie liegen in `src/mcp/tools/kit.ts`.

Jedes Tool nimmt ein optionales `slug` (den Arbeitsbereich) entgegen. Mit einem konfigurierten
Standard-Arbeitsbereich (`PLANE_WORKSPACE`) kann es überall ausgelassen werden.

| Tool                     | Was es tut                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `plane_whoami`           | der Benutzer des Schlüssels, der Arbeitsbereich, die Basis-URL und die API, die die Instanz bedient (`v1`/`v2`)     |
| `plane_list_projects`    | Projekte des Arbeitsbereichs, mit dem in Schlüsseln verwendeten Bezeichner                                          |
| `plane_list_my_issues`   | mir zugewiesene Aufgaben (standardmäßig offene), in einem Projekt oder allen                                        |
| `plane_search_issues`    | die Aufgaben eines Projekts nach Text, Zuständigem und Statusgruppe                                                 |
| `plane_get_issue`        | eine Aufgabe: Status und Gruppe, Priorität, Zuständige und Labels per Name, Daten, `url`, die Beschreibung als Text |
| `plane_get_issue_images` | lädt die Beschreibungsbilder nach `image-<n>.<ext>` herunter (Standard `<tmp>/plane-mcp/<KEY>/`)                    |
| `plane_list_comments`    | die Kommentare einer Aufgabe, älteste zuerst: Autor, Datum, Text                                                    |
| `plane_add_comment`      | kommentiert als der Benutzer des Schlüssels                                                                         |
| `plane_create_issue`     | erstellt eine Aufgabe, schreibt Status, Labels und Zuständige per Name                                              |
| `plane_update_issue`     | ändert nur die angegebenen Felder                                                                                   |
| `plane_list_states`      | die Status des Projekts, mit ihrer Gruppe                                                                           |
| `plane_list_labels`      | die Labels des Projekts                                                                                             |
| `plane_list_members`     | wer zugewiesen werden kann: Anzeigename und E-Mail                                                                  |

Keines dieser Tools löscht etwas.

## Eingaben

| Tool                                                             | Eingaben (neben `slug`)                                                                                                   |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `plane_list_my_issues`                                           | `project?`, `state_groups?` (Standard: backlog, unstarted, started), `limit` (1–200, Standard 50)                         |
| `plane_search_issues`                                            | `project`, `query?`, `assignee?` (Name, E-Mail oder `"me"`), `state_groups?`, `limit` (1–200, Standard 30)                |
| `plane_get_issue`                                                | `key`                                                                                                                     |
| `plane_get_issue_images`                                         | `key`, `dir?` (ein absoluter Ordner, wird erstellt, falls er fehlt)                                                       |
| `plane_list_comments`                                            | `key`                                                                                                                     |
| `plane_add_comment`                                              | `key`, `text`, `format` (`"text"`, Standard, oder `"markdown"`)                                                           |
| `plane_create_issue`                                             | `project`, `title`, `description?`, `state?`, `priority?`, `assignees?`, `labels?`, `start_date?`, `target_date?`         |
| `plane_update_issue`                                             | `key`, dann beliebige von `title`, `description`, `state`, `priority`, `assignees`, `labels`, `start_date`, `target_date` |
| `plane_list_states` / `plane_list_labels` / `plane_list_members` | `project`                                                                                                                 |

Statusgruppen sind `backlog`, `unstarted`, `started`, `completed` und `cancelled`. Prioritäten sind `urgent`,
`high`, `medium`, `low` und `none`. Daten haben das Format `YYYY-MM-DD`.

## Wie Namen aufgelöst werden

- **Projekte** per Bezeichner (`ACME`), Name oder ID.
- **Status** und **Labels** per Name, innerhalb des Projekts der Aufgabe.
- **Mitglieder** per `"me"`, E-Mail, Anzeigename, vollem Namen oder ID.

Ein Wert, der auf nichts passt, schlägt mit der Liste der gültigen Optionen fehl, sodass der Agent sich selbst
korrigieren kann.

## Schreiben

- `plane_create_issue` weist den Benutzer des Schlüssels zu, sofern `assignees` nicht angegeben ist (`[]`
  bedeutet niemand).
- In `plane_update_issue` ersetzen `assignees` und `labels` die ganze Liste, `description` ersetzt die ganze
  Beschreibung, und ein `null`-Datum löscht es. Gar kein Feld anzugeben ist ein Fehler.
- `description` ist reiner Text: jede Zeile wird ein Absatz.
- In `plane_add_comment` macht `format: "text"` einen Absatz pro Zeile; `format: "markdown"` rendert GFM
  (Überschriften, Listen, Checkboxen, Fettdruck) und escaped rohes HTML.

## Bilder

In `plane_get_issue` wird jedes Bild der Beschreibung zu einer `[image n]`-Markierung im Text und im `images`-
Feld aufgeführt. `plane_get_issue_images` speichert sie in derselben Reihenfolge, als `image-<n>.<ext>`, sodass
der Agent sie mit seinem Datei-Lese-Tool öffnen kann. Es erkennt den Typ anhand der Dateisignatur und begrenzt
jede Datei auf 20 MB. Ein fehlgeschlagenes oder externes Bild stoppt die anderen nicht.

Auf Plane 1.4.2 antwortet der dokumentierte Asset-Download (`GET /workspaces/<ws>/assets/<id>/`) mit 500. Der
Server ruft daher `client.workItems.attachments.download` auf, das die Weiterleitung aus dem Anhang-Detail liest
und der signierten URL folgt, ohne den API-Schlüssel zu senden.

## Ratenlimits und Caching

Plane erlaubt 60 Anfragen pro Minute. Bei einem `429` wartet der Server den `Retry-After` einmal ab (höchstens
60 s) und versucht es erneut. Projekte, Status, Labels, Mitglieder und der aktuelle Benutzer werden fünf Minuten
lang zwischengespeichert, gemeinsam genutzt von jeder Anfrage, die der Prozess bedient.
