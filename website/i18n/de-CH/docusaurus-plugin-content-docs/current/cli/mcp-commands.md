---
sidebar_position: 2
title: plane mcp
description: "plane mcp: die Konfiguration speichern, den Server im Hintergrund betreiben, bei der Anmeldung starten und in deinen MCP-Clients registrieren."
---

# `plane mcp`

`plane mcp` verwaltet den MCP-Server für dich: seine gespeicherte Konfiguration, einen Hintergrund-HTTP-Server,
einen Login-Dienst und seine Registrierung in deinen MCP-Clients.

```bash
npx plane mcp config                 # fragt die Einstellungen im Terminal ab und speichert sie
npx plane mcp config --workspace acme --port 4000   # ohne Rückfragen (Skripte, CI): speichert nur diese, behält den Rest
npx plane mcp config --web           # dasselbe, in einem lokalen Webformular
npx plane mcp install                # Claude Code / Codex / OpenCode auswählen und plane-mcp (stdio) darin registrieren
npx plane mcp install --client claude,opencode --force   # ohne Auswahl (Skripte, CI); --force ersetzt einen Eintrag
npx plane mcp uninstall              # die Clients auswählen, aus denen der Eintrag 'plane' entfernt wird (keine gespeicherte Konfiguration nötig)
npx plane mcp start                  # im Hintergrund starten (braucht eine gespeicherte Konfiguration); gibt die URL für `claude mcp add` aus
npx plane mcp start --api-key other --port 4000   # einmalige Werte, nie gespeichert
npx plane mcp status                 # läuft oder gestoppt (Exit 3), URL, PID, Laufzeit
npx plane mcp stop
npx plane mcp boot enable            # bei jeder Anmeldung starten; `boot disable` / `boot status`
```

## `plane mcp config`

Schreibt die gespeicherten Einstellungen in eine `.env` ([Konfiguration](../mcp/configuration.md)). Das
funktioniert auf drei Arten:

- **Im Terminal** (Standard). Es fragt jede Einstellung nacheinander ab, ausgehend von den gespeicherten Werten.
  Der Schlüssel wird maskiert eingegeben, und Enter übernimmt den gespeicherten. Bei den anderen Einstellungen
  löscht Strg+U die Zeile, um zum Standardwert zurückzukehren.
- **Mit Flags.** Bei einem der Flags `--api-key`, `--base-url`, `--workspace` oder `--port` fragt es nichts ab
  und speichert nur diese (`--workspace=` löscht eine). Ohne Terminal braucht es sie. Ein als Flag übergebener
  Schlüssel bleibt in deiner Shell-Historie, daher besser die Eingabeaufforderung dafür verwenden.
- **In einem Web-Formular** mit `--web`: eine lokale Seite, im Browser geöffnet (`--no-open`, um nur ihre URL
  auszugeben).

Wenn ein Server läuft, wird er angewiesen, neu zu starten, um die Änderungen zu übernehmen. `--config <file>`
(oder `PLANE_CONFIG`) schreibt eine andere Datei.

## `plane mcp install`

Erkennt jeden Client, indem es dessen `--version` ausführt, und registriert den stdio-Server über die eigene
CLI des Clients, unter dem Namen `plane`:

| Client      | Befehl, den es ausführt     |
| ----------- | --------------------------- |
| Claude Code | `claude mcp add -s user`    |
| Codex       | `codex mcp add`             |
| OpenCode    | `opencode mcp add --global` |

Der registrierte Befehl ist `node <package>/dist/mcp/cli.js` per absolutem Pfad, ohne API-Schlüssel: Der Server
liest die gespeicherte Datei, wenn der Client ihn startet (`PLANE_CONFIG` wird nur übergeben, wenn `--config`
eine andere Datei benennt).

Jeder gefundene Client startet angehakt. Einer, der bereits einen `plane`-Eintrag hat, wird als
`already installed, reinstalls` markiert und ersetzt. Ohne interaktives Terminal ist `--client` erforderlich
(`claude`, `codex`, `opencode`; innerhalb von WSL auch `claude@windows`, `codex@windows`, `opencode@windows`),
plus `--force`, um einen Eintrag zu ersetzen. `--dry-run` gibt die Befehle aus, statt sie auszuführen.

Sowohl `install` als auch `uninstall` arbeiten auf der benutzerweiten (globalen) Konfiguration jedes Clients.
Projektbezogene Einträge werden nie berührt.

## `plane mcp uninstall`

Listet die Clients mit einem `plane`-Eintrag auf, zeigt, ob er `stdio` oder `http` ist, und entfernt jeden
Eintrag dieses Namens: `claude mcp remove -s user`, `codex mcp remove`, und für OpenCode (das kein `remove`
hat) eine Bearbeitung seiner globalen Konfigurationsdatei, die nur diesen Schlüssel löscht und Kommentare und
Layout beibehält.

Es ist der einzige Befehl neben `plane mcp config`, der ohne gespeicherte Konfiguration läuft, sodass ein
Client aufgeräumt werden kann, nachdem die Konfiguration weg ist. `--client` und `--dry-run` funktionieren wie
bei `install`.

## `plane mcp start`, `stop` und `status`

`start` lässt den HTTP-Server abgekoppelt laufen und gibt seine URL, seine Log-Datei und die `claude mcp add`-
Zeile zur Registrierung aus. Es braucht eine gespeicherte Konfiguration. `--api-key`, `--base-url`, `--workspace`
und `--port` überschreiben sie nur für diesen Lauf und werden nie gespeichert. `--foreground` bedient im
aktuellen Prozess.

`status` gibt aus, ob der Server läuft, mit seiner URL, PID und Laufzeit, und beendet sich mit Code 3, wenn
nicht. `stop` fordert den Server über ein token-geschütztes `POST /shutdown` zum Herunterfahren auf und signalisiert
den Prozess nur, wenn das fehlschlägt.

## `plane mcp boot`

`boot enable` installiert einen Dienst des aktuellen Benutzers, der den Server bei jedem Login startet, sodass
kein sudo nötig ist:

| Betriebssystem | Dienst                                                                       |
| -------------- | ---------------------------------------------------------------------------- |
| Linux          | eine systemd-Benutzereinheit (bei WSL systemd in `/etc/wsl.conf` aktivieren) |
| macOS          | ein LaunchAgent                                                              |
| Windows        | ein Anmeldetask                                                              |

Der Dienst liest nur die gespeicherte Konfiguration. `boot disable` entfernt ihn und `boot status` meldet ihn.
