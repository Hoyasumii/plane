---
sidebar_position: 6
title: Pagination
description: "Offset- und Cursor-Seiten in API v2: den Seitentyp einschränken, die Paging-Regler und iterate für alle Zeilen."
---

# Pagination

`list()` antwortet mit einer Seite. `Page<T>` ist eine Union aus der Offset-Hülle (`total_count`, `next`) und
der Cursor-Hülle (`has_more`, `next_cursor`), und welche du bekommst, hängt vom `paginate`-Parameter der
Anfrage ab. Schränke sie mit `v2.isCursorPage` / `v2.isOffsetPage` ein, bevor du ein hüllenspezifisches Feld
liest. Eines ohne Einschränkung zu lesen ist ein Compile-Fehler, da es auf der anderen Hälfte der Union nicht
existieren könnte:

```ts
import { v2 } from "@hoyasumii/plane";

const page = await client.v2.workspaces.projects.states.list("acme", "ENG");
if (v2.isOffsetPage(page)) {
  console.log(page.total_count); // erst nach dem Einschränken erreichbar
} else if (v2.isCursorPage(page)) {
  console.log(page.next_cursor);
}
```

Jede Seite hat `data`, die Zeilen selbst.

## Die Paging-Regler

Listen-Parameter nehmen `per_page` entgegen, plus entweder `offset` (Offset-Paging) oder `paginate: "cursor"`
mit dem `cursor` der vorherigen Seite. `count: false` überspringt die Berechnung von `total_count` auf einer
Offset-Seite.

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

`iterate` durchläuft die Seiten für dich und liefert Zeilen, akzeptiert daher nicht die Regler, die seine
eigene Schleife setzt. Zeilen aus einer navigierbaren Ressource bleiben navigierbar:

```ts
for await (const item of client.v2.workspaces.projects.workItems.iterate("acme", "ENG", { per_page: 100 })) {
  console.log(item.name);
}
```
