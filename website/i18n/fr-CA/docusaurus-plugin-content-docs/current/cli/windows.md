---
sidebar_position: 3
title: Windows et WSL
description: "Utiliser la CLI sous Windows 10/11 depuis PowerShell ou cmd, et inscrire le serveur dans les clients Windows depuis WSL."
---

# Windows et WSL

Tout, dans la CLI, est conçu pour fonctionner depuis PowerShell ou cmd sous Windows 10/11 avec Node.js 20 ou
une version ultérieure. C'est implémenté et testé unitairement, mais pas encore testé de bout en bout sur une
installation Windows native. Le pont WSL ci-dessous a été vérifié de bout en bout.

- Le fichier de paramètres se trouve dans `%APPDATA%\plane\.env`, protégé par les permissions par utilisateur
  de ce dossier (les modes de fichier ne veulent rien dire sous Windows).
- `plane mcp boot enable` enregistre une tâche à l'ouverture de session.
- `plane mcp stop` demande au serveur de s'arrêter via un `POST /shutdown` protégé par jeton avant de se
  résoudre à le terminer.
- Les CLI des clients sont exécutées via `cross-spawn`, ce qui permet aux shims `.cmd` de Windows de fonctionner.

## Depuis WSL

Quand le paquet est installé à l'intérieur de WSL, `plane mcp install` et `uninstall` listent aussi les clients
installés côté Windows, sous la forme `Claude Code (Windows)` et ainsi de suite (`--client claude@windows`). Ils
démarrent le serveur avec `wsl.exe -d <distro> -e node …/dist/mcp/cli.js`, si bien qu'il continue de lire la
configuration enregistrée à l'intérieur de WSL. Le premier appel après une période d'inactivité de WSL paie le
coût du démarrage de la distribution (une seconde ou deux).

Le côté Windows est atteint via `powershell.exe`, pris dans le PATH ou, avec `appendWindowsPath = false`, dans
`/mnt/c/Windows/System32/WindowsPowerShell/v1.0/`. Quand il ne peut pas être atteint, `--client claude@windows`
indique quelle étape a échoué.

Pour démarrer le serveur à la connexion à l'intérieur de WSL, activez d'abord systemd dans `/etc/wsl.conf`, puis
exécutez `npx plane mcp boot enable`.
