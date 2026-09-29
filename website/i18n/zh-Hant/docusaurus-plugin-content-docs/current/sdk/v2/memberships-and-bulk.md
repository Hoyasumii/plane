---
sidebar_position: 4
title: 成員關係與批次寫入
description: "API v2 中的成員關係橋接（add 與 remove，最多 100 個 id）與批次寫入（最多 50 項），以及兩個上限為何不同。"
---

# 成員關係與批次寫入

**這裡有兩個批次上限，而且它們是兩個不同的數字。**

| 批次型別         | 上限                            | 方法                                        |
| ---------------- | ------------------------------- | ------------------------------------------- |
| 一次成員關係橋接 | `v2.BRIDGE_MAX_IDS` (100) 個 id | `add` / `remove`（以及型別屬性上的 `link`） |
| 一次批次寫入     | `v2.BULK_MAX_ITEMS` (50) 項     | `bulkCreate` / `bulkUpdate` / `bulkDelete`  |

第一個數字來自 golden 檔案裡 24 個 `add`/`remove` schema 上的 `maxItems`，第二個數字來自 21 個批次
create/update/delete schema 上的 `maxItems`。把一次橋接呼叫的大小設成 50 也能用，但會浪費掉每次往返一半
的容量；把一次批次呼叫的大小設成 100 則會在客戶端直接丟擲異常。

## 成員關係

成員關係是某個子資源上的 `add`/`remove`，這個子資源以被新增的東西命名：先是路徑 id，然後是 1..100 個 id
（`BRIDGE_MAX_IDS`）。一個空列表或者過大的列表會在發出任何請求之前就丟擲異常。每次呼叫只會傳送它自己的
那個動詞，並且解析為伺服器實際改動過的那些 id。

```ts
const v2ns = client.v2;

await v2ns.workspaces.projects.cycles.workItems.add("acme", "ENG", cycleId, [itemId]); // -> ["<item id>"]
await v2ns.workspaces.projects.modules.workItems.remove("acme", "ENG", moduleId, [itemId]);
await v2ns.workspaces.releases.labels.add("acme", releaseId, [labelId]);
await v2ns.workspaces.initiatives.projects.add("acme", initiativeId, [projectId]);
await v2ns.workspaces.wiki.collections.members.add("acme", collectionId, [{ member_id: userId, access: 1 }]);
```

工作項目型別上的屬性用的是 `link`/`unlink`，而不是 `add`/`remove`，這和網頁版應用是一致的。`unlink` 會刪
除該屬性在這個型別下每一個工作項目上的值。

```ts
await client.v2.workspaces.projects.workItemTypes.properties.link("acme", "ENG", typeId, [propertyId]);
await client.v2.workspaces.projects.workItemTypes.properties.unlink("acme", "ENG", typeId, propertyId);
```

## 批次寫入 {#bulk-writes}

`bulkCreate` / `bulkUpdate` / `bulkDelete` 總是返回 HTTP 200，即便其中一些行失敗了：部分成功就是預設
行為。返回結果裡會統計 `succeeded` 和 `failed`，並且在 `results` 裡為每一行放一個條目。呼叫
`v2.raiseForFailures(result)` 會丟擲一個攜帶著第一個失敗項 `errors` 的 `PlaneApiError`，或者用
`v2.bulkFailures(result)` 讀取失敗的那些行。

這個上限是每次呼叫 50 項（`BULK_MAX_ITEMS`），不是成員關係橋接的 100。一個空的批次會在客戶端被直接拒
絕，而不是悄悄地什麼都不做。

```ts
import { v2 } from "@hoyasumii/plane";

const result = await client.v2.workspaces.projects.states.bulkCreate("acme", "ENG", [{ name: "QA", color: "#ffffff" }]);
v2.raiseForFailures(result);

// 每一個 bulkUpdate 條目都是補丁內容加上目標 id。
await client.v2.workspaces.projects.states.bulkUpdate("acme", "ENG", [{ id: "state-1", color: "#000000" }]);
```

每一個批次方法都接受一個最後的 `allOrNone` 引數（預設為 `false`）。傳入 `true` 可以要求伺服器要麼應用
每一行，要麼一行都不應用。

要寫入超過 50 行，請自己把它們拆分開：

```ts
import { v2, v2models } from "@hoyasumii/plane";

const rows: v2models.CreateState[] = [{ name: "QA", color: "#ffffff" }];

for (let start = 0; start < rows.length; start += v2.BULK_MAX_ITEMS) {
  const chunk = rows.slice(start, start + v2.BULK_MAX_ITEMS);
  v2.raiseForFailures(await client.v2.workspaces.projects.states.bulkCreate("acme", "ENG", chunk));
}
```
