---
sidebar_position: 7
title: Wiki
description: "API v2 中的工作區 Wiki：v2.workspaces.wiki 下的全域頁面、集合及其成員。"
---

# Wiki

`v2.workspaces.wiki` 把工作區 wiki 分組在了一起：

- `v2.workspaces.wiki.pages` 是工作區中每一個全域性頁面。一個專案自己的頁面則是
  `v2.workspaces.projects.pages`。
- `v2.workspaces.wiki.collections` 是這個 wiki 的集合（collections），帶有它們的 `members` 橋接。

一次頁面寫入的 `collection_id` 對公開頁面可以省略，它會落在工作區預設的「General」集合裡。一個私有頁面
則需要一個明確的 `collection_id`，指向呼叫者自己擁有的某個集合。

```ts
const wiki = client.v2.workspaces.wiki;

await wiki.pages.create("acme", { name: "Handbook" }); // 公開頁面 -> 預設集合
const handbook = await wiki.collections.findByName("acme", "Engineering handbook");
await wiki.pages.create("acme", { name: "Runbook", collection_id: handbook.id });
await wiki.collections.default("acme"); // 預設集合，透過 `is_default` 解析出來
```

`wiki` 和 `groupSync` 是分組節點，不是資源：它們不消費任何屬於自己的路徑 id，所以它們不是某個已取出的
工作區行上的導航屬性。要以扁平方式存取它們。

wiki 頁面模型從包的根部匯出為 `V2Page`，在 `v2models` 下則是 `v2models.Page`。
