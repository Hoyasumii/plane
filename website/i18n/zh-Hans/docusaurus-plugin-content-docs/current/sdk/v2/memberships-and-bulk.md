---
sidebar_position: 4
title: 成员关系与批量写入
description: "API v2 中的成员关系桥接（add 和 remove，最多 100 个 id）与批量写入（最多 50 项），以及两个上限为何不同。"
---

# 成员关系与批量写入

**这里有两个批量上限，而且它们是两个不同的数字。**

| 批量类型         | 上限                            | 方法                                        |
| ---------------- | ------------------------------- | ------------------------------------------- |
| 一次成员关系桥接 | `v2.BRIDGE_MAX_IDS` (100) 个 id | `add` / `remove`（以及类型属性上的 `link`） |
| 一次批量写入     | `v2.BULK_MAX_ITEMS` (50) 项     | `bulkCreate` / `bulkUpdate` / `bulkDelete`  |

第一个数字来自 golden 文件里 24 个 `add`/`remove` schema 上的 `maxItems`，第二个数字来自 21 个批量
create/update/delete schema 上的 `maxItems`。把一次桥接调用的大小设成 50 也能用，但会浪费掉每次往返一半
的容量；把一次批量调用的大小设成 100 则会在客户端直接抛出异常。

## 成员关系

成员关系是某个子资源上的 `add`/`remove`，这个子资源以被添加的东西命名：先是路径 id，然后是 1..100 个 id
（`BRIDGE_MAX_IDS`）。一个空列表或者过大的列表会在发出任何请求之前就抛出异常。每次调用只会发送它自己的
那个动词，并且解析为服务器实际改动过的那些 id。

```ts
const v2ns = client.v2;

await v2ns.workspaces.projects.cycles.workItems.add("acme", "ENG", cycleId, [itemId]); // -> ["<item id>"]
await v2ns.workspaces.projects.modules.workItems.remove("acme", "ENG", moduleId, [itemId]);
await v2ns.workspaces.releases.labels.add("acme", releaseId, [labelId]);
await v2ns.workspaces.initiatives.projects.add("acme", initiativeId, [projectId]);
await v2ns.workspaces.wiki.collections.members.add("acme", collectionId, [{ member_id: userId, access: 1 }]);
```

工作项类型上的属性用的是 `link`/`unlink`，而不是 `add`/`remove`，这和网页版应用是一致的。`unlink` 会删
除该属性在这个类型下每一个工作项上的值。

```ts
await client.v2.workspaces.projects.workItemTypes.properties.link("acme", "ENG", typeId, [propertyId]);
await client.v2.workspaces.projects.workItemTypes.properties.unlink("acme", "ENG", typeId, propertyId);
```

## 批量写入 {#bulk-writes}

`bulkCreate` / `bulkUpdate` / `bulkDelete` 总是返回 HTTP 200，即便其中一些行失败了：部分成功就是默认
行为。返回结果里会统计 `succeeded` 和 `failed`，并且在 `results` 里为每一行放一个条目。调用
`v2.raiseForFailures(result)` 会抛出一个携带着第一个失败项 `errors` 的 `PlaneApiError`，或者用
`v2.bulkFailures(result)` 读取失败的那些行。

这个上限是每次调用 50 项（`BULK_MAX_ITEMS`），不是成员关系桥接的 100。一个空的批量会在客户端被直接拒
绝，而不是悄悄地什么都不做。

```ts
import { v2 } from "@hoyasumii/plane";

const result = await client.v2.workspaces.projects.states.bulkCreate("acme", "ENG", [{ name: "QA", color: "#ffffff" }]);
v2.raiseForFailures(result);

// 每一个 bulkUpdate 条目都是补丁内容加上目标 id。
await client.v2.workspaces.projects.states.bulkUpdate("acme", "ENG", [{ id: "state-1", color: "#000000" }]);
```

每一个批量方法都接受一个最后的 `allOrNone` 参数（默认为 `false`）。传入 `true` 可以要求服务器要么应用
每一行，要么一行都不应用。

要写入超过 50 行，请自己把它们拆分开：

```ts
import { v2, v2models } from "@hoyasumii/plane";

const rows: v2models.CreateState[] = [{ name: "QA", color: "#ffffff" }];

for (let start = 0; start < rows.length; start += v2.BULK_MAX_ITEMS) {
  const chunk = rows.slice(start, start + v2.BULK_MAX_ITEMS);
  v2.raiseForFailures(await client.v2.workspaces.projects.states.bulkCreate("acme", "ENG", chunk));
}
```
