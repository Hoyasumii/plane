---
sidebar_position: 3
title: 字段投影
description: "fields 如何在编译时收窄返回类型（读取和写入都适用），以及收窄唯一失效的地方。"
---

# 字段投影

`fields` 缩小的是**返回类型**，不仅仅是响应内容。只要求两个字段，你拿到的行就只有这两个字段加上 `id`。
读取其他任何字段都会是一个编译错误，而不是运行时的 `undefined`：

```ts
const page = await client.v2.workspaces.projects.states.list("acme", "ENG", { fields: ["id", "name"] });
for (const state of page.data) {
  console.log(state.id, state.name); // 已类型化：这一行上只存在 id/name
  // console.log(state.color);       // 编译错误：并没有请求过 `color`
}
```

一个内联的数组字面量不需要 `as const`。对 `iterate` 和 `retrieve` 也是同理，并且——由于本质上是同一个
论断——对**写入**也是一样：`create`、`update` 和 `upsert` 都接受 `fields`，并以同样的方式缩小它们的返回
结果。

```ts
const created = await client.v2.workspaces.projects.states.create(
  "acme",
  "ENG",
  { name: "In Review", color: "#4ECDC4" },
  { fields: ["id", "name"] }
);
console.log(created.name); // 已缩小；`created.color` 无法通过编译
```

## 在运行时构建的字段列表

一个在运行时构建（而不是字面量）的字段列表，仍然必须被类型化为字段名。普通的 `string[]` **不能**赋值给
`readonly StateField[]`，会得到一条很长的重载不匹配错误。行会被缩小到该列表的**元素类型**，所以要把变量
类型标注得和你实际用到的一样窄：

```ts
import { PlaneClient, v2 } from "@hoyasumii/plane";

const client = new PlaneClient({ baseUrl: "https://api.plane.so", apiKey: "..." });

// 缩小到这两个名字，即便这个值是在运行时才选定的。
const wanted: ("id" | "name")[] = includeColor ? ["id", "name"] : ["id"];
const page = await client.v2.workspaces.projects.states.list("acme", "ENG", { fields: wanted });

// 换成整个联合类型之后，这就缩小成了「每一个字段」，也就是完整的行。
const anything: v2.StateField[] = includeColor ? ["id", "name", "color"] : ["id", "name"];
const unnarrowed = await client.v2.workspaces.projects.states.list("acme", "ENG", { fields: anything });
```

`"all"` 是一个合法的字段值，意思是「每个字段」，它会正确地得到完整的行类型。

响应内容是稀疏的，这意味着在模型中除了 `id` 之外的每一个可读字段都是可选的。请检查 `undefined`，而不是
假设它一定存在。当这个列表是动态构建的时候，`row.$loaded.present` 会告诉你实际返回了什么。

## 导航调用不会缩小类型 {#navigated-calls-do-not-narrow}

**这个限制正是扁平形式继续保持公开的原因。** 一次导航调用是针对通用签名解析的，所以它会接受 `fields`，
但**不会**缩小类型：

```ts
const eng = await client.v2.workspaces.projects.retrieve("acme", "ENG");
const listed = await eng.states.list({ fields: ["id", "name"] }); // Page<State>，没有被缩小
```

TypeScript 在通过一个导航属性背后的条件类型进行推断时，会擦除类型参数，所以缩小类型的重载无法被带过去。
即便去匹配那个重载集合，情况也不会变好，反而会更糟：这样的推断会把 `F` 擦除为它的约束，从而声称*每一个*
字段都存在。当你想要缩小后的行时，请以扁平形式调用该资源：
`client.v2.workspaces.projects.states.list("acme", "ENG", { fields: [...] })`。

## `expand` 和 `order_by`

`expand` 会内联相关对象（在一个工作项上是 `{ expand: ["state", "labels"] }`），并会根据 `v2.EXPAND` 中
该操作允许的值进行校验。

`order_by` 的校验方式和 `fields` 一样，是针对一个生成出来的联合类型（`StateOrderBy`、`LabelOrderBy`……）
进行的。在这个联合类型之外的字面量是一个编译错误，而一个在运行时构建出来的值会被 `encodeOrderBy` 在客户
端拒绝，而不会以一个 400 的形式到达服务器。

```ts
await client.v2.workspaces.projects.states.list("acme", "ENG", { order_by: "-created_at" });
```
