---
sidebar_position: 7
title: Wiki
description: "API v2 中的工作区 Wiki：v2.workspaces.wiki 下的全局页面、集合及其成员。"
---

# Wiki

`v2.workspaces.wiki` 把工作区 wiki 分组在了一起：

- `v2.workspaces.wiki.pages` 是工作区中每一个全局页面。一个项目自己的页面则是
  `v2.workspaces.projects.pages`。
- `v2.workspaces.wiki.collections` 是这个 wiki 的集合（collections），带有它们的 `members` 桥接。

一次页面写入的 `collection_id` 对公开页面可以省略，它会落在工作区默认的「General」集合里。一个私有页面
则需要一个明确的 `collection_id`，指向调用者自己拥有的某个集合。

```ts
const wiki = client.v2.workspaces.wiki;

await wiki.pages.create("acme", { name: "Handbook" }); // 公开页面 -> 默认集合
const handbook = await wiki.collections.findByName("acme", "Engineering handbook");
await wiki.pages.create("acme", { name: "Runbook", collection_id: handbook.id });
await wiki.collections.default("acme"); // 默认集合，通过 `is_default` 解析出来
```

`wiki` 和 `groupSync` 是分组节点，不是资源：它们不消费任何属于自己的路径 id，所以它们不是某个已取出的
工作区行上的导航属性。要以扁平方式访问它们。

wiki 页面模型从包的根部导出为 `V2Page`，在 `v2models` 下则是 `v2models.Page`。
