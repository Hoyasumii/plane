---
sidebar_position: 4
title: Herramientas de work item
description: "Cuatro herramientas MCP tipadas para work items sobre la API v2, con sus filtros, fields y expand."
---

# Herramientas de work item

Cuatro herramientas tipadas cubren los work items mediante la API v2, con sus filtros, `fields` y `expand`.
Viven en `src/mcp/tools/curated.ts`. Todo lo demás pasa por las [herramientas genéricas](./generic-tools.md).

| Herramienta              | Qué hace                                                                        |
| ------------------------ | ------------------------------------------------------------------------------- |
| `plane_list_work_items`  | los work items de un proyecto, o de todo el workspace cuando se omite `project` |
| `plane_get_work_item`    | un work item, por identificador (`ENG-123`) o por UUID más `project`            |
| `plane_create_work_item` | crea un work item en un proyecto                                                |
| `plane_update_work_item` | cambia los campos dados, y envía solo esos                                      |

`slug` es obligatorio a menos que haya un workspace por defecto configurado. `project` es un UUID de proyecto o
su identificador (`ENG`), y `workItem` un identificador como `ENG-123` o un UUID. Con un identificador, no se
necesita ningún proyecto: se resuelve mediante la búsqueda a nivel de todo el workspace.

## `plane_list_work_items`

| Entrada        | Significado                                                            |
| -------------- | ---------------------------------------------------------------------- |
| `project?`     | un proyecto; si se omite, todo el workspace                            |
| `search?`      | búsqueda de texto libre                                                |
| `state_id?`    | un estado                                                              |
| `state_group?` | `backlog`, `unstarted`, `started`, `completed`, `cancelled` o `triage` |
| `assignee_id?` | un responsable                                                         |
| `label_id?`    | un label                                                               |
| `priority?`    | `none`, `low`, `medium`, `high` o `urgent`                             |
| `cycle_id?`    | un cycle                                                               |
| `module_id?`   | un módulo                                                              |
| `order_by?`    | un orden de clasificación, p. ej. `-updated_at`                        |
| `fields?`      | solo estos campos, p. ej. `["name", "state_id"]`                       |
| `per_page?`    | tamaño de página, 1–100                                                |
| `offset?`      | filas a saltar, para la página siguiente                               |

Para los filtros que estas entradas no cubren, ejecuta `plane_describe` sobre `workspaces.projects.workItems`
`list`.

## `plane_get_work_item`

`workItem`, más `project` (solo cuando `workItem` es un UUID) y `expand` (objetos relacionados a incrustar,
p. ej. `["state", "labels"]`).

## `plane_create_work_item` y `plane_update_work_item`

Ambas toman `project` (create) o `workItem` (update), y luego los campos del work item. `name` es obligatorio
al crear.

| Campo                        | Significado                                                          |
| ---------------------------- | -------------------------------------------------------------------- |
| `name`                       | el título                                                            |
| `description_html`           | la descripción como HTML, p. ej. `<p>text</p>`                       |
| `state` / `state_id`         | un nombre de estado (`In Progress`) o su id                          |
| `priority`                   | `none`, `low`, `medium`, `high` o `urgent`                           |
| `assignees` / `assignee_ids` | correos de los responsables, o sus ids                               |
| `labels` / `label_ids`       | nombres de labels, o sus ids                                         |
| `parent`                     | el identificador o el id del work item padre                         |
| `type`                       | el nombre de un tipo de work item                                    |
| `start_date` / `target_date` | `YYYY-MM-DD`; la fecha objetivo no puede ser anterior a la de inicio |
| `estimate`                   | un valor de estimación                                               |
| `cycle_id`                   | un id de cycle, o `null`                                             |

## En una instancia sin API v2

En Plane 1.4.x self-hosted, estas cuatro herramientas responden mediante v1 (`src/mcp/tools/work-items-v1.ts`)
con las mismas entradas. Los parámetros que solo v2 puede servir (`cycle_id`, `module_id`, `order_by`, `fields`,
`expand`, `type`, `estimate`) fallan por nombre en vez de ser ignorados.
