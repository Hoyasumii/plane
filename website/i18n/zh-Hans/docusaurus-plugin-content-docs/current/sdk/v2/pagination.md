---
sidebar_position: 6
title: 分页
description: "API v2 中的 offset 分页与 cursor 分页：如何收窄分页类型、分页参数，以及用 iterate 遍历所有行。"
---

# 分页

`list()` 返回一页数据。`Page<T>` 是偏移量信封（`total_count`、`next`）和游标信封（`has_more`、
`next_cursor`）的联合类型，你拿到哪一种取决于请求里的 `paginate` 参数。在读取某个信封专属的字段之前，
请先用 `v2.isCursorPage` / `v2.isOffsetPage` 缩小类型。不缩小类型就去读取其中一个字段是一个编译错误，
因为它可能在联合类型的另一半上并不存在：

```ts
import { v2 } from "@hoyasumii/plane";

const page = await client.v2.workspaces.projects.states.list("acme", "ENG");
if (v2.isOffsetPage(page)) {
  console.log(page.total_count); // 只有缩小类型之后才能访问到
} else if (v2.isCursorPage(page)) {
  console.log(page.next_cursor);
}
```

每一页都有 `data`，也就是行数据本身。

## 分页参数

列表参数接受 `per_page`，再加上 `offset`（偏移量分页）或者带着上一页 `cursor` 的
`paginate: "cursor"`。`count: false` 会跳过在偏移量分页里计算 `total_count`。

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

`iterate` 会帮你翻页并产出行，所以它不接受它自己那个循环会设置的那些参数。来自一个可导航资源的行，依然
保持可导航：

```ts
for await (const item of client.v2.workspaces.projects.workItems.iterate("acme", "ENG", { per_page: 100 })) {
  console.log(item.name);
}
```
