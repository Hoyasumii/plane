---
sidebar_position: 6
title: 分頁
description: "API v2 中的 offset 分頁與 cursor 分頁：如何收窄分頁型別、分頁引數，以及用 iterate 走訪所有列。"
---

# 分頁

`list()` 返回一頁資料。`Page<T>` 是偏移量信封（`total_count`、`next`）和遊標信封（`has_more`、
`next_cursor`）的聯合型別，你拿到哪一種取決於請求裡的 `paginate` 引數。在讀取某個信封專屬的欄位之前，
請先用 `v2.isCursorPage` / `v2.isOffsetPage` 縮小型別。不縮小型別就去讀取其中一個欄位是一個編譯錯誤，
因為它可能在聯合型別的另一半上並不存在：

```ts
import { v2 } from "@hoyasumii/plane";

const page = await client.v2.workspaces.projects.states.list("acme", "ENG");
if (v2.isOffsetPage(page)) {
  console.log(page.total_count); // 只有縮小型別之後才能存取到
} else if (v2.isCursorPage(page)) {
  console.log(page.next_cursor);
}
```

每一頁都有 `data`，也就是行資料本身。

## 分頁引數

列表引數接受 `per_page`，再加上 `offset`（偏移量分頁）或者帶著上一頁 `cursor` 的
`paginate: "cursor"`。`count: false` 會跳過在偏移量分頁裡計算 `total_count`。

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

`iterate` 會幫你翻頁併產出行，所以它不接受它自己那個迴圈會設定的那些引數。來自一個可導航資源的行，依然
保持可導航：

```ts
for await (const item of client.v2.workspaces.projects.workItems.iterate("acme", "ENG", { per_page: 100 })) {
  console.log(item.name);
}
```
