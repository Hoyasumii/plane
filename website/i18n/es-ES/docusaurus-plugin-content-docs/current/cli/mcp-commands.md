---
sidebar_position: 2
title: plane mcp
description: "plane mcp: guarda la configuración, ejecuta el servidor en segundo plano, inícialo al iniciar sesión y regístralo en tus clientes MCP."
---

# `plane mcp`

`plane mcp` gestiona el servidor MCP por ti: su configuración guardada, un servidor HTTP en segundo plano, un
servicio de inicio de sesión y su registro en tus clientes MCP.

```bash
npx plane mcp config                 # pide la configuración en el terminal y la guarda
npx plane mcp config --workspace acme --port 4000   # sin preguntas (scripts, CI): guarda solo esto, mantiene el resto
npx plane mcp config --web           # lo mismo, en un formulario web local
npx plane mcp install                # elige Claude Code / Codex / OpenCode y registra plane-mcp (stdio) en ellos
npx plane mcp install --client claude,opencode --force   # sin selector (scripts, CI); --force sustituye una entrada
npx plane mcp uninstall              # elige los clientes de los que quitar la entrada 'plane' (no necesita config guardada)
npx plane mcp start                  # inicia en segundo plano (necesita config guardada); imprime la URL para `claude mcp add`
npx plane mcp start --api-key other --port 4000   # valores puntuales, nunca se guardan
npx plane mcp status                 # en ejecución o detenido (salida 3), URL, pid, tiempo activo
npx plane mcp stop
npx plane mcp boot enable            # se inicia en cada inicio de sesión; `boot disable` / `boot status`
```

## `plane mcp config`

Escribe el `.env` guardado ([Configuración](../mcp/configuration.md)). Funciona de tres formas:

- **En el terminal** (la opción por defecto). Pide cada configuración por turno, partiendo de los valores
  guardados. La clave se escribe enmascarada, y Enter mantiene la guardada. Para las demás configuraciones,
  borra la línea (Ctrl+U) para volver al valor por defecto.
- **Con flags.** Con cualquiera de `--api-key`, `--base-url`, `--workspace` o `--port`, no pregunta nada y
  guarda solo esos (`--workspace=` borra uno). Sin terminal, son obligatorios. Una clave pasada como flag queda
  en el historial de tu shell, así que para ella es mejor usar el prompt.
- **En un formulario web** con `--web`: una página local, abierta en el navegador (`--no-open` solo imprime su
  URL).

Si hay un servidor en ejecución, se le avisa para que se reinicie y recoja los cambios. `--config <archivo>` (o
`PLANE_CONFIG`) escribe otro archivo.

## `plane mcp install`

Detecta cada cliente ejecutando su `--version`, y registra el servidor stdio mediante la propia CLI del
cliente, bajo el nombre `plane`:

| Cliente     | Comando que ejecuta         |
| ----------- | --------------------------- |
| Claude Code | `claude mcp add -s user`    |
| Codex       | `codex mcp add`             |
| OpenCode    | `opencode mcp add --global` |

El comando registrado es `node <paquete>/dist/mcp/cli.js` por ruta absoluta, sin clave de API: el servidor lee
el archivo guardado cuando el cliente lo lanza (`PLANE_CONFIG` solo se pasa cuando `--config` nombra otro
archivo).

Todo cliente encontrado empieza marcado. Uno que ya tiene una entrada `plane` aparece como
`already installed, reinstalls` y se le sustituye. Sin un terminal interactivo, `--client` es obligatorio
(`claude`, `codex`, `opencode`; dentro de WSL también `claude@windows`, `codex@windows`, `opencode@windows`),
más `--force` para sustituir una entrada. `--dry-run` imprime los comandos en vez de ejecutarlos.

Tanto `install` como `uninstall` trabajan sobre la configuración a nivel de usuario (global) de cada cliente.
Las entradas de ámbito de proyecto nunca se tocan.

## `plane mcp uninstall`

Lista los clientes con una entrada `plane`, mostrando si es `stdio` o `http`, y elimina cualquier entrada con
ese nombre: `claude mcp remove -s user`, `codex mcp remove`, y en OpenCode (que no tiene `remove`) una edición
de su archivo de configuración global que borra solo esa clave, manteniendo comentarios y formato.

Es el único comando además de `plane mcp config` que se ejecuta sin una configuración guardada, para que un
cliente se pueda limpiar después de que la configuración ya no exista. `--client` y `--dry-run` funcionan como
en `install`.

## `plane mcp start`, `stop` y `status`

`start` ejecuta el servidor HTTP en modo detached, e imprime su URL, su archivo de log y la línea
`claude mcp add` para registrarlo. Necesita una configuración guardada. `--api-key`, `--base-url`,
`--workspace` y `--port` la sobrescriben solo para esta ejecución, y nunca se guardan. `--foreground` lo sirve
en el proceso actual.

`status` imprime si el servidor está en ejecución, con su URL, pid y tiempo activo, y sale con código 3 cuando
no lo está. `stop` pide al servidor que se apague mediante un `POST /shutdown` protegido por token, y solo
señala al proceso si eso falla.

## `plane mcp boot`

`boot enable` instala un servicio del usuario actual que inicia el servidor en cada inicio de sesión, así que
no se necesita sudo:

| SO      | Servicio                                                                   |
| ------- | -------------------------------------------------------------------------- |
| Linux   | una unit de usuario de systemd (en WSL, activa systemd en `/etc/wsl.conf`) |
| macOS   | un LaunchAgent                                                             |
| Windows | una tarea de inicio de sesión                                              |

El servicio solo lee la configuración guardada. `boot disable` lo elimina y `boot status` informa de su
estado.
