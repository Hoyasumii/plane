---
sidebar_position: 1
title: API v2 概覽
description: "client.v2 上的 API v2 介面：90 個資源、作為前置位置參數的路徑 id，以及標準方法名稱。"
---

# API v2 概覽

`client.v2` 用來存取 v2 表面：90 個資源類，是根據 Plane 的 api_v2 OpenAPI 文件生成的。客戶端上的 v1 資源
保持不變（參見 [API v1](../v1.md)）。

有**兩種進入方式**，而且無論走哪種方式，都是同樣的資源：

1. **扁平路徑。** 每個資源都是一個屬性，每個 id 都是一個引數。
2. **已載入的行。** 一行被載入之後，就是它的子項所在的地方。參見 [已載入的行](./loaded-rows.md)。

## 扁平路徑

一個資源掛在名稱空間中，位置由它的 URL 決定，並且把 URL 中命名的那些 id 當作**位置在前的引數**接收，
順序與路徑一致：

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

`v2.workspaces` 和 `v2.workspaces.projects` 是兩個根。每個資源都恰好位於一條屬性路徑上，也就是它的 URL
所命名的那條路徑：工作區級別的資源在 `v2.workspaces` 下，專案級別的資源在 `v2.workspaces.projects` 下。

`project` 既接受專案的 UUID，**也**接受它可讀的識別符號（`"ENG"`）。一個工作項目可以透過它的人類可讀鍵，用
`retrieveByIdentifier` 來查詢。沒有任何 v2 方法會接受 `workspaceSlug` 或 `project` 選項物件：路徑 id 是
位置引數，且始終排在最前，順序與 URL 一致，其他一切都放在末尾的 `params` 物件中。

```ts
// ENG-123，不需要先知道它屬於哪個專案。
const item = await client.v2.workspaces.workItems.retrieveByIdentifier("acme", "ENG-123");
console.log(item.name);
```

## 標準方法

大多數資源都會暴露一部分相同的動詞，每個動詞的路徑 id 都排在最前：

| 方法                                       | 作用                                                            |
| ------------------------------------------ | --------------------------------------------------------------- |
| `list(...ids, params?)`                    | 一頁資料（[分頁](./pagination.md)）                             |
| `iterate(...ids, params?)`                 | 一個幫你翻頁的非同步迭代器                                      |
| `retrieve(...ids, id, params?)`            | 一行資料                                                        |
| `create(...ids, data, params?)`            | 新建一行                                                        |
| `update(...ids, id, data, params?)`        | 部分更新                                                        |
| `upsert(...ids, data, params?)`            | 建立，或者更新擁有相同 `external_source`/`external_id` 的那一行 |
| `delete(...ids, id)`                       | 刪除該行                                                        |
| `archive` / `unarchive`                    | 用於專案和工作項目                                              |
| `bulkCreate` / `bulkUpdate` / `bulkDelete` | 批次操作（[成員關係與批次寫入](./memberships-and-bulk.md)）     |
| `findByName` 及其他 `findBy*`              | 按人類可讀鍵查詢唯一一行（[查詢](./lookups.md)）                |

接受 `fields` 的讀取和寫入方法，會把返回型別縮小到你要求的那些欄位上（[欄位投影](./field-projection.md)）。
`expand` 會內聯相關物件，`order_by` 會針對該操作自身的排序方式進行校驗。

## 生成的資料

`v2.FIELDS`、`v2.EXPAND` 和 `v2.ORDER_BY` 是完整的「操作 id → 允許值」對映表，編碼器就是拿它們來做校驗的
（例如 `v2.FIELDS["states_list"]` 列出了 `states.list` 接受的每一個欄位）。`v2.OPENAPI_VERSION` 是 SDK
據以生成的 api_v2 文件版本號。以上這些，加上兩個上限 `v2.BULK_MAX_ITEMS` 和 `v2.BRIDGE_MAX_IDS`，都被
匯出了，這樣你就可以列舉合法的值，而不必去猜。

```ts
import { v2 } from "@hoyasumii/plane";

console.log(v2.OPENAPI_VERSION, v2.FIELDS["states_list"]);
```
