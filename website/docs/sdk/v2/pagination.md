---
sidebar_position: 6
title: Pagination
---

# Pagination

`list()` answers one page. `Page<T>` is a union of the offset envelope (`total_count`, `next`) and the cursor
envelope (`has_more`, `next_cursor`), and which one you get depends on the request's `paginate` param. Narrow
it with `v2.isCursorPage` / `v2.isOffsetPage` before reading an envelope-specific field. Reading one without
narrowing is a compile error, since it may not exist on the other half of the union:

```ts
import { v2 } from "@hoyasumii/plane";

const page = await client.v2.workspaces.projects.states.list("acme", "ENG");
if (v2.isOffsetPage(page)) {
  console.log(page.total_count); // only reachable once narrowed
} else if (v2.isCursorPage(page)) {
  console.log(page.next_cursor);
}
```

Every page has `data`, the rows themselves.

## The paging knobs

List params take `per_page`, plus either `offset` (offset paging) or `paginate: "cursor"` with the `cursor`
of the previous page. `count: false` skips computing `total_count` on an offset page.

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

`iterate` follows the pages for you and yields rows, so it does not accept the knobs its own loop sets. Rows
from a navigable resource stay navigable:

```ts
for await (const item of client.v2.workspaces.projects.workItems.iterate("acme", "ENG", { per_page: 100 })) {
  console.log(item.name);
}
```
