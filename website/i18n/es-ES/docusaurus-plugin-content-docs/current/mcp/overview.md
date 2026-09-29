---
sidebar_position: 1
title: Descripción general del servidor MCP
description: "El servidor MCP de Plane: Plane para Claude Code, Codex, OpenCode, Claude Desktop y cualquier otro cliente MCP."
---

# Servidor MCP

`@hoyasumii/plane/mcp` convierte el SDK en un servidor [MCP](https://modelcontextprotocol.io), así que Claude
Code, Codex, OpenCode, Claude Desktop o cualquier otro cliente MCP puede trabajar con Plane.

## Dos transportes

| Transporte              | Quién ejecuta el servidor                                   | Cómo iniciarlo                                        |
| ----------------------- | ----------------------------------------------------------- | ----------------------------------------------------- |
| **stdio** (por defecto) | el cliente MCP lanza `plane-mcp` y es dueño del proceso     | `plane mcp install`, o registra `plane-mcp` a mano    |
| **Streamable HTTP**     | un servidor de larga duración que comparten varios clientes | `plane mcp start`, `plane-mcp --http`, o desde código |

En modo stdio el servidor se inicia con el cliente y termina cuando el cliente cierra stdin. stdout lleva el
protocolo, así que el servidor registra los logs solo en stderr. En modo HTTP escucha solo en `127.0.0.1`, sin
estado sobre Streamable HTTP (`POST /mcp`), y su caché la comparte cada cliente que se conecta.

## Tres tipos de herramientas

- **[Herramientas de tarea](./task-tools.md)** (`plane_get_issue`, `plane_update_issue`, `plane_add_comment`,
  …) son el contrato estable en el que se apoyan los flujos de agentes basados en tareas. Toman tareas por
  clave (`ACME-130`) y proyectos, estados, labels y miembros por nombre, y responden con salida legible, sin
  ids. Siempre usan la API v1, que sirven tanto Plane Cloud como el self-hosted.
- **[Herramientas de work item](./work-item-tools.md)** (`plane_list_work_items`, `plane_get_work_item`,
  `plane_create_work_item`, `plane_update_work_item`) usan la API v2, con sus filtros, `fields` y `expand`.
- **[Herramientas genéricas](./generic-tools.md)** (`plane_resources`, `plane_describe`, `plane_call`)
  alcanzan cualquier otro método v2, en los 90 recursos.

## Instancias sin API v2

Plane 1.4.x self-hosted responde 404 a cada ruta `/api/v2`. El servidor lo averigua con un
`GET /api/v2/users/me/` la primera vez que lo necesita, y recuerda la respuesta durante toda la vida del
proceso. Una clave incorrecta o un error de red no se recuerdan. En una instancia así:

- Las herramientas de tarea funcionan como siempre, ya que usan v1 de todos modos.
- Las herramientas `*_work_item` responden mediante v1 con las mismas entradas. Los parámetros que solo v2
  puede servir (`cycle_id`, `module_id`, `order_by`, `fields`, `expand`, `type`, `estimate`) fallan por nombre.
- `plane_resources` y `plane_call` avisan de que v2 no está disponible y señalan las herramientas tipadas, en
  vez de retransmitir un 404. `plane_describe` sigue funcionando, porque solo lee el catálogo.

`plane_whoami` informa de qué API sirve la instancia (`v1` o `v2`).

## Próximos pasos

- [Configuración inicial](./setup.md): registra el servidor en tu cliente MCP.
- [Configuración](./configuration.md): los ajustes y dónde se guardan.
- [Uso programático](./programmatic.md): inicia el servidor desde tu propio código.
