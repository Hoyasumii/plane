---
sidebar_position: 4
title: Membresías y escrituras en lote
description: "Puentes de membresía (add y remove, hasta 100 ids) y escrituras en lote (hasta 50 elementos) en la API v2, y por qué los límites difieren."
---

# Membresías y escrituras en lote

**Hay dos límites de lote, y son números distintos.**

| Lote                   | Límite                         | Métodos                                                |
| ---------------------- | ------------------------------ | ------------------------------------------------------ |
| Un puente de membresía | `v2.BRIDGE_MAX_IDS` (100) ids  | `add` / `remove` (y `link` en las propiedades de tipo) |
| Una escritura en lote  | `v2.BULK_MAX_ITEMS` (50) items | `bulkCreate` / `bulkUpdate` / `bulkDelete`             |

El primero es el `maxItems` del golden en los 24 esquemas de `add`/`remove`; el segundo, su `maxItems` en los
21 esquemas de create/update/delete en lote. Dimensionar una llamada de puente en 50 funciona, pero desperdicia
la mitad de cada ida y vuelta; dimensionar una llamada en lote en 100 lanza un error en el cliente.

## Membresías

Las membresías son `add`/`remove` en un sub-recurso con el nombre de lo que se añade: primero los ids de ruta,
luego 1..100 ids (`BRIDGE_MAX_IDS`). Una lista vacía o demasiado grande lanza un error antes de cualquier
petición. Cada llamada envía solo su propio verbo y resuelve a los ids que el servidor realmente cambió.

```ts
const v2ns = client.v2;

await v2ns.workspaces.projects.cycles.workItems.add("acme", "ENG", cycleId, [itemId]); // -> ["<item id>"]
await v2ns.workspaces.projects.modules.workItems.remove("acme", "ENG", moduleId, [itemId]);
await v2ns.workspaces.releases.labels.add("acme", releaseId, [labelId]);
await v2ns.workspaces.initiatives.projects.add("acme", initiativeId, [projectId]);
await v2ns.workspaces.wiki.collections.members.add("acme", collectionId, [{ member_id: userId, access: 1 }]);
```

Las propiedades de un tipo de work item usan `link`/`unlink` en su lugar, igual que la app web. `unlink`
elimina los valores de esa propiedad en todos los work items del tipo.

```ts
await client.v2.workspaces.projects.workItemTypes.properties.link("acme", "ENG", typeId, [propertyId]);
await client.v2.workspaces.projects.workItemTypes.properties.unlink("acme", "ENG", typeId, propertyId);
```

## Escrituras en lote {#bulk-writes}

`bulkCreate` / `bulkUpdate` / `bulkDelete` siempre responden HTTP 200, incluso cuando algunas filas fallan: el
éxito parcial es el comportamiento por defecto. La respuesta cuenta `succeeded` y `failed` y tiene una entrada
por fila en `results`. Llama a `v2.raiseForFailures(result)` para lanzar un `PlaneApiError` con los `errors` del
primer fallo, o lee las filas fallidas con `v2.bulkFailures(result)`.

El límite es de 50 items por llamada (`BULK_MAX_ITEMS`), no los 100 que acepta un puente de membresía. Un lote
vacío se rechaza en el cliente en vez de ser una operación silenciosa que no hace nada.

```ts
import { v2 } from "@hoyasumii/plane";

const result = await client.v2.workspaces.projects.states.bulkCreate("acme", "ENG", [{ name: "QA", color: "#ffffff" }]);
v2.raiseForFailures(result);

// Cada item de bulkUpdate es el patch más el id de destino.
await client.v2.workspaces.projects.states.bulkUpdate("acme", "ENG", [{ id: "state-1", color: "#000000" }]);
```

Todo método en lote recibe un último argumento `allOrNone` (por defecto `false`). Pasa `true` para pedirle al
servidor que aplique todas las filas o ninguna.

Para escribir más de 50 filas, divídelas tú mismo:

```ts
import { v2, v2models } from "@hoyasumii/plane";

const rows: v2models.CreateState[] = [{ name: "QA", color: "#ffffff" }];

for (let start = 0; start < rows.length; start += v2.BULK_MAX_ITEMS) {
  const chunk = rows.slice(start, start + v2.BULK_MAX_ITEMS);
  v2.raiseForFailures(await client.v2.workspaces.projects.states.bulkCreate("acme", "ENG", chunk));
}
```
