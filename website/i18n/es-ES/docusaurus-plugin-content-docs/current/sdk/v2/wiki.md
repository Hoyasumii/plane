---
sidebar_position: 7
title: Wiki
description: "La wiki del workspace en la API v2: páginas globales, colecciones y sus miembros, en v2.workspaces.wiki."
---

# Wiki

`v2.workspaces.wiki` agrupa la wiki del workspace:

- `v2.workspaces.wiki.pages` es cada página global del workspace. Las páginas de un proyecto son
  `v2.workspaces.projects.pages` en su lugar.
- `v2.workspaces.wiki.collections` son las colecciones de la wiki, con su puente `members`.

El `collection_id` de una escritura de página se puede omitir para una página pública, que va a parar a la
colección "General" por defecto del workspace. Una página privada necesita un `collection_id` explícito de una
colección que el llamador posea.

```ts
const wiki = client.v2.workspaces.wiki;

await wiki.pages.create("acme", { name: "Handbook" }); // página pública -> colección por defecto
const handbook = await wiki.collections.findByName("acme", "Engineering handbook");
await wiki.pages.create("acme", { name: "Runbook", collection_id: handbook.id });
await wiki.collections.default("acme"); // la colección por defecto, resuelta mediante `is_default`
```

`wiki` y `groupSync` son nodos de agrupación, no recursos: no consumen ningún id de ruta propio, así que no son
propiedades de navegación en una fila de workspace obtenida. Llega a ellos en plano.

El modelo de página de la wiki se exporta como `V2Page` desde la raíz del paquete, y como `v2models.Page`.
