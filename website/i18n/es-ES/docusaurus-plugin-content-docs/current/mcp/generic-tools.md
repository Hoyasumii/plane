---
sidebar_position: 5
title: Herramientas genéricas
description: "plane_resources, plane_describe y plane_call: tres herramientas MCP que llegan a todos los métodos de la API v2 en los 90 recursos."
---

# Herramientas genéricas

Tres herramientas alcanzan todos los métodos v2 que tiene el SDK, en los 90 recursos: cycles, modules, pages,
releases, initiatives, customers, webhooks, y el resto. Viven en `src/mcp/tools/generic.ts`.

1. **`plane_resources`** encuentra un recurso. Sin `query`, lista todas las rutas de recursos con sus nombres
   de método. Con uno (`"cycle work items"`, `"webhook"`), muestra los recursos que coinciden con sus firmas de
   método.
2. **`plane_describe`** toma un `resource` y un `method` y muestra la firma completa: los parámetros en el
   orden de llamada (con los campos del cuerpo de escritura), cuáles de ellos son ids de ruta, los valores
   permitidos de `fields`/`expand`/`order_by`/filtro, y un ejemplo de entrada para `plane_call`.
3. **`plane_call`** ejecuta el método, con sus argumentos por nombre de parámetro.

Un intercambio típico, tal como lo ve el agente:

```json
{ "tool": "plane_resources", "arguments": { "query": "cycle" } }
{ "tool": "plane_describe", "arguments": { "resource": "workspaces.projects.cycles", "method": "list" } }
{
  "tool": "plane_call",
  "arguments": {
    "resource": "workspaces.projects.cycles",
    "method": "list",
    "args": { "slug": "acme", "project": "ENG", "params": { "per_page": 20 } }
  }
}
```

## `plane_call`

| Entrada    | Significado                                                                                                           |
| ---------- | --------------------------------------------------------------------------------------------------------------------- |
| `resource` | la ruta de recurso separada por puntos, p. ej. `workspaces.projects.states`                                           |
| `method`   | el nombre del método, p. ej. `list`, `create`, `add`                                                                  |
| `args`     | argumentos por nombre de parámetro: primero los ids de ruta (`slug`, `project`, …), luego los objetos `data`/`params` |
| `limit`    | para los métodos `iterate`: cuántos items recopilar (por defecto 100, como máximo 1000)                               |
| `confirm`  | debe ser `true` para ejecutar un método destructivo                                                                   |

`slug` usa por defecto el workspace configurado. Los `params` de lista aceptan `fields`, filtros, `order_by`,
`per_page` y `offset`. Un resultado más largo de 60.000 caracteres se recorta, con una nota que lo indica.

**Los métodos destructivos** (`delete`, `bulkDelete`, `remove`, `unlink`) se niegan a ejecutarse sin
`confirm: true`. La descripción de la herramienta le dice al agente que primero pregunte al usuario.

## El catálogo

Las herramientas genéricas leen `src/mcp/generated/catalog.json`: rutas de recursos, nombres de parámetros en
el orden de llamada, y los valores permitidos del documento OpenAPI de api_v2. Se genera a partir del código
fuente del SDK con `pnpm codegen:mcp`, y nunca se edita a mano.

`plane_call` solo alcanza los métodos del catálogo, y ordena los argumentos con nombre según los nombres de
parámetro que declara. En una instancia sin API v2, `plane_resources` y `plane_call` se niegan con un mensaje
que señala las herramientas tipadas; `plane_describe` sigue funcionando, porque solo lee el catálogo.
