---
sidebar_position: 1
title: Descripción general de la API v2
description: "La superficie de la API v2 en client.v2: 90 recursos, ids de ruta como parámetros posicionales iniciales y los nombres de método estándar."
---

# Descripción general de la API v2

`client.v2` alcanza la superficie v2: 90 clases de recursos, generadas a partir del documento OpenAPI api_v2 de
Plane. Los recursos v1 del cliente no cambian (consulta [API v1](../v1.md)).

Hay **dos formas de entrar**, y en ambas son los mismos recursos:

1. **La ruta plana.** Cada recurso es un atributo, y cada id es un argumento.
2. **Filas cargadas.** Una fila obtenida es donde viven sus hijos. Consulta [Filas cargadas](./loaded-rows.md).

## La ruta plana

Un recurso cuelga del namespace en la posición que le da su URL, y recibe los ids que nombra su URL como
**argumentos posicionales iniciales**, en el orden de la ruta:

```ts
import { PlaneClient } from "@hoyasumii/plane";

const client = new PlaneClient({ baseUrl: "https://api.plane.so", apiKey: "..." });

// GET /workspaces/acme/projects/ENG/states/
await client.v2.workspaces.projects.states.list("acme", "ENG");

// GET /workspaces/acme/projects/ENG/work-items/wi-1/comments/
await client.v2.workspaces.projects.workItems.comments.list("acme", "ENG", "wi-1");

// GET /workspaces/acme/teamspaces/
await client.v2.workspaces.teamspaces.list("acme");
```

`v2.workspaces` y `v2.workspaces.projects` son las dos raíces. Cada recurso se ubica en exactamente una ruta de
atributo, la que nombra su URL: un recurso a nivel de workspace bajo `v2.workspaces`, uno a nivel de proyecto
bajo `v2.workspaces.projects`.

`project` acepta el UUID de un proyecto **o** su identificador legible (`"ENG"`). Se puede llegar a un work item
por su clave humana con `retrieveByIdentifier`. Ningún método v2 recibe un objeto de opciones `workspaceSlug` o
`project`: los ids de ruta son posicionales y siempre van primero, en el orden de la URL, y todo lo demás vive
en el objeto `params` final.

```ts
// ENG-123, sin conocer antes su proyecto.
const item = await client.v2.workspaces.workItems.retrieveByIdentifier("acme", "ENG-123");
console.log(item.name);
```

## Los métodos estándar

La mayoría de los recursos exponen algunos de los mismos verbos, cada uno con sus ids de ruta primero:

| Método                                     | Qué hace                                                               |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| `list(...ids, params?)`                    | una página de filas ([Paginación](./pagination.md))                    |
| `iterate(...ids, params?)`                 | un iterador async que recorre las páginas por ti                       |
| `retrieve(...ids, id, params?)`            | una fila                                                               |
| `create(...ids, data, params?)`            | una fila nueva                                                         |
| `update(...ids, id, data, params?)`        | una actualización parcial                                              |
| `upsert(...ids, data, params?)`            | crea, o actualiza la fila con el mismo `external_source`/`external_id` |
| `delete(...ids, id)`                       | elimina la fila                                                        |
| `archive` / `unarchive`                    | en proyectos y work items                                              |
| `bulkCreate` / `bulkUpdate` / `bulkDelete` | lotes ([Membresías y escrituras en lote](./memberships-and-bulk.md))   |
| `findByName` y otros `findBy*`             | exactamente una fila por una clave humana ([Búsquedas](./lookups.md))  |

Las lecturas y escrituras que aceptan `fields` restringen su tipo de retorno a los campos que pediste
([Proyección de campos](./field-projection.md)). `expand` incrusta objetos relacionados, y `order_by` se
comprueba contra los órdenes de clasificación propios de la operación.

## Datos generados

`v2.FIELDS`, `v2.EXPAND` y `v2.ORDER_BY` son los mapas completos de id de operación → valores permitidos contra
los que validan los encoders (por ejemplo, `v2.FIELDS["states_list"]` lista todos los campos que acepta
`states.list`). `v2.OPENAPI_VERSION` es la versión del documento api_v2 a partir de la cual se generó el SDK.
Todos ellos, más los dos límites `v2.BULK_MAX_ITEMS` y `v2.BRIDGE_MAX_IDS`, se exportan para que puedas enumerar
los valores válidos en vez de adivinar.

```ts
import { v2 } from "@hoyasumii/plane";

console.log(v2.OPENAPI_VERSION, v2.FIELDS["states_list"]);
```
