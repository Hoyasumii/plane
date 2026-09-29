---
sidebar_position: 3
title: Windows y WSL
description: "Cómo usar la CLI en Windows 10/11 desde PowerShell o cmd, y registrar el servidor en los clientes de Windows desde WSL."
---

# Windows y WSL

Todo en la CLI está diseñado para funcionar desde PowerShell o cmd en Windows 10/11 con Node.js 20 o una versión
posterior. Está implementado y probado con tests unitarios, pero todavía no se ha probado manualmente en una
instalación nativa de Windows. El puente con WSL de más abajo se ha verificado de punta a punta.

- El archivo de configuración vive en `%APPDATA%\plane\.env`, protegido por los permisos por usuario de esa
  carpeta (los modos de archivo no significan nada en Windows).
- `plane mcp boot enable` registra una tarea de inicio de sesión.
- `plane mcp stop` pide al servidor que se apague mediante un `POST /shutdown` protegido por token antes de
  recurrir a terminarlo.
- Las CLI de los clientes se ejecutan mediante `cross-spawn`, así que los shims `.cmd` de Windows funcionan.

## Desde WSL

Cuando el paquete se instala dentro de WSL, `plane mcp install` y `uninstall` también listan los clientes
instalados en el lado de Windows, como `Claude Code (Windows)`, etc. (`--client claude@windows`). Inician el
servidor con `wsl.exe -d <distro> -e node …/dist/mcp/cli.js`, así que sigue leyendo la configuración guardada
dentro de WSL. La primera llamada después de que WSL haya estado inactivo paga el coste de arrancar la distro
(uno o dos segundos).

Se llega al lado de Windows mediante `powershell.exe`, tomado del PATH o, con `appendWindowsPath = false`, de
`/mnt/c/Windows/System32/WindowsPowerShell/v1.0/`. Cuando no se puede alcanzar, `--client claude@windows` indica
qué paso falló.

Para iniciar el servidor al iniciar sesión dentro de WSL, activa primero systemd en `/etc/wsl.conf`, y luego
ejecuta `npx plane mcp boot enable`.
