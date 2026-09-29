---
sidebar_position: 1
title: API v2 概览
description: "client.v2 上的 API v2 接口：90 个资源、作为前置位置参数的路径 id，以及标准方法名。"
---

# API v2 概览

`client.v2` 用来访问 v2 表面：90 个资源类，是根据 Plane 的 api_v2 OpenAPI 文档生成的。客户端上的 v1 资源
保持不变（参见 [API v1](../v1.md)）。

有**两种进入方式**，而且无论走哪种方式，都是同样的资源：

1. **扁平路径。** 每个资源都是一个属性，每个 id 都是一个参数。
2. **已加载的行。** 一行被加载之后，就是它的子项所在的地方。参见 [已加载的行](./loaded-rows.md)。

## 扁平路径

一个资源挂在命名空间中，位置由它的 URL 决定，并且把 URL 中命名的那些 id 当作**位置在前的参数**接收，
顺序与路径一致：

```ts
import { PlaneClient } from "@hoyasumii/plane";

const client = new PlaneClient({ baseUrl: "https://api.plane.so", apiKey: "..." });

// GET /workspaces/acme/projects/ENG/states/
await client.v2.workspaces.projects.states.list("acme", "ENG");

// GET /workspaces/acme/projects/ENG/work-items/wi-1/comments/
await client.v2.workspaces.projects.workItems.comments.list("acme", "ENG", "wi-1");

// GET /workspaces/acme/teamspaces/
await client.v2.workspaces.teamspaces.list("acme");
```

`v2.workspaces` 和 `v2.workspaces.projects` 是两个根。每个资源都恰好位于一条属性路径上，也就是它的 URL
所命名的那条路径：工作区级别的资源在 `v2.workspaces` 下，项目级别的资源在 `v2.workspaces.projects` 下。

`project` 既接受项目的 UUID，**也**接受它可读的标识符（`"ENG"`）。一个工作项可以通过它的人类可读键，用
`retrieveByIdentifier` 来查找。没有任何 v2 方法会接受 `workspaceSlug` 或 `project` 选项对象：路径 id 是
位置参数，且始终排在最前，顺序与 URL 一致，其他一切都放在末尾的 `params` 对象中。

```ts
// ENG-123，不需要先知道它属于哪个项目。
const item = await client.v2.workspaces.workItems.retrieveByIdentifier("acme", "ENG-123");
console.log(item.name);
```

## 标准方法

大多数资源都会暴露一部分相同的动词，每个动词的路径 id 都排在最前：

| 方法                                       | 作用                                                            |
| ------------------------------------------ | --------------------------------------------------------------- |
| `list(...ids, params?)`                    | 一页数据（[分页](./pagination.md)）                             |
| `iterate(...ids, params?)`                 | 一个帮你翻页的异步迭代器                                        |
| `retrieve(...ids, id, params?)`            | 一行数据                                                        |
| `create(...ids, data, params?)`            | 新建一行                                                        |
| `update(...ids, id, data, params?)`        | 部分更新                                                        |
| `upsert(...ids, data, params?)`            | 创建，或者更新拥有相同 `external_source`/`external_id` 的那一行 |
| `delete(...ids, id)`                       | 删除该行                                                        |
| `archive` / `unarchive`                    | 用于项目和工作项                                                |
| `bulkCreate` / `bulkUpdate` / `bulkDelete` | 批量操作（[成员关系与批量写入](./memberships-and-bulk.md)）     |
| `findByName` 及其他 `findBy*`              | 按人类可读键查找唯一一行（[查找](./lookups.md)）                |

接受 `fields` 的读取和写入方法，会把返回类型缩小到你要求的那些字段上（[字段投影](./field-projection.md)）。
`expand` 会内联相关对象，`order_by` 会针对该操作自身的排序方式进行校验。

## 生成的数据

`v2.FIELDS`、`v2.EXPAND` 和 `v2.ORDER_BY` 是完整的「操作 id → 允许值」映射表，编码器就是拿它们来做校验的
（例如 `v2.FIELDS["states_list"]` 列出了 `states.list` 接受的每一个字段）。`v2.OPENAPI_VERSION` 是 SDK
据以生成的 api_v2 文档版本号。以上这些，加上两个上限 `v2.BULK_MAX_ITEMS` 和 `v2.BRIDGE_MAX_IDS`，都被
导出了，这样你就可以枚举合法的值，而不必去猜。

```ts
import { v2 } from "@hoyasumii/plane";

console.log(v2.OPENAPI_VERSION, v2.FIELDS["states_list"]);
```
