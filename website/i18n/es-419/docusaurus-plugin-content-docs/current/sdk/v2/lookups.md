---
sidebar_position: 5
title: Búsquedas por clave humana
description: "Búsquedas que resuelven exactamente una fila en el servidor por nombre, slug o clave, y lanzan un error cuando no coincide ninguna o coincide más de una."
---

# Búsquedas por clave humana

Una búsqueda resuelve exactamente una fila en el servidor, y lanza un error cuando no hay exactamente una:
`NoMatchFoundError` cuando nada coincide, `MultipleMatchesFoundError` cuando coinciden varias.

- `findByName` en cualquier lugar donde la API filtre por `name`: states, labels, cycles, modules, projects,
  teamspaces, views, colecciones de wiki, tipos y propiedades de work item, opciones y contextos de propiedad,
  y más.
- `roles.findBySlug`, `estimates.points.findByKey`, `releases.tags.findByVersion`.
- `customerProperties.findByDisplayName`, junto a `findByName`.

```ts
await client.v2.workspaces.projects.states.findByName("acme", "ENG", "Todo");
await client.v2.workspaces.roles.findBySlug("acme", "admin", { namespace: "workspace" });
await client.v2.workspaces.projects.estimates.points.findByKey("acme", "ENG", estimateId, 3);
```

En las propiedades personalizadas, `name` es la clave técnica (por ejemplo, `story_points`), no la etiqueta que
se muestra en la app.

Ambos errores extienden `PlaneError`, **no** `PlaneApiError`, así que capturar solo `PlaneApiError` no los
captura:

```ts
import { MultipleMatchesFoundError, NoMatchFoundError } from "@hoyasumii/plane";

try {
  await client.v2.workspaces.projects.states.findByName("acme", "ENG", "Todo");
} catch (error) {
  if (error instanceof NoMatchFoundError) console.log("no such state");
  else if (error instanceof MultipleMatchesFoundError) console.log("the name is ambiguous");
  else throw error;
}
```
