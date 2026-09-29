---
sidebar_position: 1
title: Descripción general de la CLI
description: "El comando plane: cada herramienta MCP como un subcomando, con el esquema de entrada de la herramienta como flags."
---

# CLI

El paquete instala un comando `plane`. Es un cliente MCP del [mismo servidor](../mcp/overview.md): cada
herramienta MCP se convierte en un subcomando, y el esquema de entrada de la herramienta se convierte en sus
flags. Por defecto el servidor se ejecuta dentro del comando, así que no hay nada que iniciar antes.

```bash
npx plane mcp config                 # una vez: guarda la clave de API (PLANE_BASE_URL usa por defecto https://api.plane.so)
npx plane tools                      # todos los comandos, uno por herramienta MCP
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

Nada excepto `--help`, `--version` y `plane docs` funciona hasta que `plane mcp config` haya guardado una
configuración con una clave de API. `plane docs` imprime el enlace a este sitio y lo abre en el navegador.

## De herramientas a comandos

- El comando es el nombre de la herramienta sin `plane_`, en kebab-case: `plane_list_work_items` →
  `list-work-items`.
- Cada flag es una entrada en kebab-case: `per_page` → `--per-page`, `workItem` → `--work-item`.
- Los flags de array aceptan `a,b` o JSON, los flags de objeto aceptan JSON, y los flags booleanos no necesitan
  valor.
- `plane <comando> --help` lista los flags de un comando, con los valores permitidos de las entradas enum.

La salida de la herramienta va a stdout. Un error de la herramienta va a stderr con código de salida 1.

## Hablando con un servidor en ejecución

Para usar un `plane-mcp` que ya se está ejecutando por HTTP en vez del que corre en el mismo proceso, pasa
`--url http://127.0.0.1:3766/mcp` o define `PLANE_MCP_URL`. `--base-url` y `--api-key` sobrescriben el entorno y
el archivo guardado para el servidor en el mismo proceso.

Ninguno de estos flags sustituye a la configuración guardada: la CLI se niega a ejecutar herramientas sin ella,
incluso cuando se da `--url` o `--api-key`.

## Gestionando el servidor

`plane mcp` se intercepta antes de establecer ninguna conexión. Configura el servidor, lo ejecuta en segundo
plano, lo inicia al iniciar sesión y lo registra en tus clientes MCP. Consulta [`plane mcp`](./mcp-commands.md).
