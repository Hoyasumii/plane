---
sidebar_position: 3
title: Windows und WSL
description: "Die CLI unter Windows 10/11 aus PowerShell oder cmd nutzen und den Server aus WSL heraus in Windows-Clients registrieren."
---

# Windows und WSL

Alles in der CLI ist so gebaut, dass es unter PowerShell oder cmd auf Windows 10/11 mit Node.js 20 oder neuer
funktioniert. Es ist implementiert und mit Unit-Tests abgedeckt, aber noch nicht auf einer nativen
Windows-Installation smoke-getestet. Die WSL-Brücke unten wurde end-to-end verifiziert.

- Die Einstellungsdatei liegt in `%APPDATA%\plane\.env`, geschützt durch die Pro-Benutzer-Berechtigungen dieses
  Ordners (Dateimodi bedeuten unter Windows nichts).
- `plane mcp boot enable` registriert einen Anmeldetask.
- `plane mcp stop` fordert den Server über ein token-geschütztes `POST /shutdown` zum Herunterfahren auf, bevor
  es als Rückfallebene auf das Beenden des Prozesses zurückgreift.
- Die Client-CLIs werden über `cross-spawn` ausgeführt, sodass Windows-`.cmd`-Shims funktionieren.

## Von WSL aus

Wenn das Paket innerhalb von WSL installiert ist, listen `plane mcp install` und `uninstall` auch die auf der
Windows-Seite installierten Clients auf, als `Claude Code (Windows)` und so weiter (`--client claude@windows`).
Sie starten den Server mit `wsl.exe -d <distro> -e node …/dist/mcp/cli.js`, sodass er weiterhin die innerhalb
von WSL gespeicherte Konfiguration liest. Der erste Aufruf, nachdem WSL im Leerlauf war, bezahlt dafür, dass die
Distribution startet (ein bis zwei Sekunden).

Die Windows-Seite wird über `powershell.exe` erreicht, entweder aus dem PATH oder, mit
`appendWindowsPath = false`, aus `/mnt/c/Windows/System32/WindowsPowerShell/v1.0/`. Wenn sie nicht erreicht
werden kann, sagt `--client claude@windows`, welcher Schritt fehlgeschlagen ist.

Um den Server beim Login innerhalb von WSL zu starten, aktiviere zunächst systemd in `/etc/wsl.conf` und führe
dann `npx plane mcp boot enable` aus.
