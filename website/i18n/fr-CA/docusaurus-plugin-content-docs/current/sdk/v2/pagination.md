---
sidebar_position: 6
title: Pagination
description: "Les pages par offset et par curseur de l'API v2 : restreindre le type de page, les réglages de pagination et iterate pour toutes les lignes."
---

# Pagination

`list()` répond une page. `Page<T>` est une union de l'enveloppe par décalage (`total_count`, `next`) et de
l'enveloppe par curseur (`has_more`, `next_cursor`), et celle que vous obtenez dépend du paramètre `paginate`
de la requête. Restreignez-la avec `v2.isCursorPage` / `v2.isOffsetPage` avant de lire un champ propre à une
enveloppe. Lire un tel champ sans restreindre est une erreur de compilation, puisqu'il peut ne pas exister sur
l'autre moitié de l'union :

```ts
import { v2 } from "@hoyasumii/plane";

const page = await client.v2.workspaces.projects.states.list("acme", "ENG");
if (v2.isOffsetPage(page)) {
  console.log(page.total_count); // atteignable seulement une fois restreint
} else if (v2.isCursorPage(page)) {
  console.log(page.next_cursor);
}
```

Chaque page a `data`, les lignes elles-mêmes.

## Les réglages de pagination

Les paramètres de liste prennent `per_page`, plus soit `offset` (pagination par décalage) soit
`paginate: "cursor"` avec le `cursor` de la page précédente. `count: false` évite de calculer `total_count` sur
une page par décalage.

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

`iterate` suit les pages pour vous et rend des lignes, donc il n'accepte pas les réglages que sa propre boucle
définit. Les lignes d'une ressource navigable restent navigables :

```ts
for await (const item of client.v2.workspaces.projects.workItems.iterate("acme", "ENG", { per_page: 100 })) {
  console.log(item.name);
}
```
