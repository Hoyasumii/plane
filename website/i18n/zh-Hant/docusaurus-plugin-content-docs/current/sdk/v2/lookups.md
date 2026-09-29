---
sidebar_position: 5
title: 按人類可讀鍵查詢
description: "在伺服器端依名稱、slug 或鍵精確解析一列的查詢方法；沒有符合或符合超過一列時擲出錯誤。"
---

# 按人類可讀鍵查詢

一次查詢會在伺服器上解析出恰好一行，如果不是恰好一行就會丟擲異常：沒有匹配到任何東西時丟擲
`NoMatchFoundError`，匹配到多行時丟擲 `MultipleMatchesFoundError`。

- 在 API 按 `name` 過濾的任何地方都有 `findByName`：狀態、標籤、迭代週期、模組、專案、團隊空間、檢視、
  wiki 集合、工作項目型別與屬性、屬性選項與上下文，等等。
- `roles.findBySlug`、`estimates.points.findByKey`、`releases.tags.findByVersion`。
- `customerProperties.findByDisplayName`，和 `findByName` 並列存在。

```ts
await client.v2.workspaces.projects.states.findByName("acme", "ENG", "Todo");
await client.v2.workspaces.roles.findBySlug("acme", "admin", { namespace: "workspace" });
await client.v2.workspaces.projects.estimates.points.findByKey("acme", "ENG", estimateId, 3);
```

對自定義屬性來說，`name` 是機器鍵（例如 `story_points`），不是應用裡顯示的那個標籤。

這兩個錯誤都繼承自 `PlaneError`，**不是** `PlaneApiError`，所以僅捕獲 `PlaneApiError` 並不能捕獲它們：

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
