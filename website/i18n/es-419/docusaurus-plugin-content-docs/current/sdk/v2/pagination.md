---
sidebar_position: 6
title: Paginación
description: "Páginas por offset y por cursor en la API v2: cómo restringir el tipo de página, los controles de paginación e iterate para todas las filas."
---

# Paginación

`list()` devuelve una página. `Page<T>` es una unión del sobre por offset (`total_count`, `next`) y el sobre por
cursor (`has_more`, `next_cursor`), y cuál de los dos obtienes depende del parámetro `paginate` de la petición.
Restríngelo con `v2.isCursorPage` / `v2.isOffsetPage` antes de leer un campo propio de un sobre concreto. Leer
uno sin restringir antes es un error de compilación, ya que puede no existir en la otra mitad de la unión:

```ts
import { v2 } from "@hoyasumii/plane";

const page = await client.v2.workspaces.projects.states.list("acme", "ENG");
if (v2.isOffsetPage(page)) {
  console.log(page.total_count); // solo accesible una vez restringido
} else if (v2.isCursorPage(page)) {
  console.log(page.next_cursor);
}
```

Toda página tiene `data`, las propias filas.

## Los controles de paginación

Los params de `list` aceptan `per_page`, más `offset` (paginación por offset) o `paginate: "cursor"` con el
`cursor` de la página anterior. `count: false` omite calcular `total_count` en una página por offset.

```ts
const first = await client.v2.workspaces.projects.workItems.list("acme", "ENG", { per_page: 50, paginate: "cursor" });
if (v2.isCursorPage(first) && first.has_more) {
  await client.v2.workspaces.projects.workItems.list("acme", "ENG", {
    per_page: 50,
    paginate: "cursor",
    cursor: first.next_cursor ?? undefined,
  });
}
```

## `iterate`

`iterate` recorre las páginas por ti y devuelve filas, así que no acepta los controles que su propio bucle ya
gestiona. Las filas de un recurso navegable siguen siendo navegables:

```ts
for await (const item of client.v2.workspaces.projects.workItems.iterate("acme", "ENG", { per_page: 100 })) {
  console.log(item.name);
}
```
