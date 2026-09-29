---
sidebar_position: 3
title: 欄位投影
description: "fields 如何在編譯時收窄回傳型別（讀取與寫入皆適用），以及收窄唯一失效之處。"
---

# 欄位投影

`fields` 縮小的是**返回型別**，不僅僅是回應內容。只要求兩個欄位，你拿到的行就只有這兩個欄位加上 `id`。
讀取其他任何欄位都會是一個編譯錯誤，而不是執行時的 `undefined`：

```ts
const page = await client.v2.workspaces.projects.states.list("acme", "ENG", { fields: ["id", "name"] });
for (const state of page.data) {
  console.log(state.id, state.name); // 已型別化：這一行上只存在 id/name
  // console.log(state.color);       // 編譯錯誤：並沒有請求過 `color`
}
```

一個內聯的陣列字面量不需要 `as const`。對 `iterate` 和 `retrieve` 也是同理，並且——由於本質上是同一個
論斷——對**寫入**也是一樣：`create`、`update` 和 `upsert` 都接受 `fields`，並以同樣的方式縮小它們的返回
結果。

```ts
const created = await client.v2.workspaces.projects.states.create(
  "acme",
  "ENG",
  { name: "In Review", color: "#4ECDC4" },
  { fields: ["id", "name"] }
);
console.log(created.name); // 已縮小；`created.color` 無法透過編譯
```

## 在執行時構建的欄位列表

一個在執行時構建（而不是字面量）的欄位列表，仍然必須被型別化為欄位名。普通的 `string[]` **不能**賦值給
`readonly StateField[]`，會得到一條很長的過載不匹配錯誤。行會被縮小到該列表的**元素型別**，所以要把變數
型別標註得和你實際用到的一樣窄：

```ts
import { PlaneClient, v2 } from "@hoyasumii/plane";

const client = new PlaneClient({ baseUrl: "https://api.plane.so", apiKey: "..." });

// 縮小到這兩個名字，即便這個值是在執行時才選定的。
const wanted: ("id" | "name")[] = includeColor ? ["id", "name"] : ["id"];
const page = await client.v2.workspaces.projects.states.list("acme", "ENG", { fields: wanted });

// 換成整個聯合型別之後，這就縮小成了「每一個欄位」，也就是完整的行。
const anything: v2.StateField[] = includeColor ? ["id", "name", "color"] : ["id", "name"];
const unnarrowed = await client.v2.workspaces.projects.states.list("acme", "ENG", { fields: anything });
```

`"all"` 是一個合法的欄位值，意思是「每個欄位」，它會正確地得到完整的行型別。

回應內容是稀疏的，這意味著在模型中除了 `id` 之外的每一個可讀欄位都是可選的。請檢查 `undefined`，而不是
假設它一定存在。當這個列表是動態構建的時候，`row.$loaded.present` 會告訴你實際返回了什麼。

## 導航呼叫不會縮小型別 {#navigated-calls-do-not-narrow}

**這個限制正是扁平形式繼續保持公開的原因。** 一次導航呼叫是針對通用簽名解析的，所以它會接受 `fields`，
但**不會**縮小型別：

```ts
const eng = await client.v2.workspaces.projects.retrieve("acme", "ENG");
const listed = await eng.states.list({ fields: ["id", "name"] }); // Page<State>，沒有被縮小
```

TypeScript 在透過一個導航屬性背後的條件型別進行推斷時，會擦除型別引數，所以縮小型別的過載無法被帶過去。
即便去匹配那個過載集合，情況也不會變好，反而會更糟：這樣的推斷會把 `F` 擦除為它的約束，從而聲稱*每一個*
欄位都存在。當你想要縮小後的行時，請以扁平形式呼叫該資源：
`client.v2.workspaces.projects.states.list("acme", "ENG", { fields: [...] })`。

## `expand` 和 `order_by`

`expand` 會內聯相關物件（在一個工作項目上是 `{ expand: ["state", "labels"] }`），並會根據 `v2.EXPAND` 中
該操作允許的值進行校驗。

`order_by` 的校驗方式和 `fields` 一樣，是針對一個生成出來的聯合型別（`StateOrderBy`、`LabelOrderBy`……）
進行的。在這個聯合型別之外的字面量是一個編譯錯誤，而一個在執行時構建出來的值會被 `encodeOrderBy` 在客戶
端拒絕，而不會以一個 400 的形式到達伺服器。

```ts
await client.v2.workspaces.projects.states.list("acme", "ENG", { order_by: "-created_at" });
```
