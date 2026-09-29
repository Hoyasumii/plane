---
sidebar_position: 2
title: 已加载的行
description: "API v2 中的可导航行：获取到的行携带自身的 id，因此访问其子资源时无需再次传入。"
---

# 已加载的行

一个有子项的资源，其每一个会返回行的方法都会给出**可导航的行**：这一行自身的数据，加上每个子项对应的一
个属性，且产生它所需的那些 id 已经提供好了。这就是「id 消费」规则：_一个 id 只在它被知道的那一刻传递一
次_。一个没有子项的资源（`states`、`labels`、`roles`）会返回普通模型，因为没有什么可以从它那里再往下走。

```ts
const workspace = await client.v2.workspaces.retrieve("acme");

await workspace.projects.list(); // 不需要 slug
await workspace.teamspaces.list(); // 不需要 slug

// 而且可以继续链下去：一个已取出的项目携带着这两个 id。
const eng = await workspace.projects.retrieve("ENG");
await eng.states.list(); // 不需要 slug，也不需要 project 键
await eng.workItems.create({ name: "Fix login bug", state: "Todo", labels: ["bug"] });

// 深入三层：一个已取出的工作项携带着全部三个 id。
const item = await eng.workItems.retrieve("wi-1");
await item.comments.list();
```

链式调用之所以可行，是因为一行「知道是哪些 id 把它取出来的」。`list` 和 `iterate` 返回的也是可导航的行，
所以翻页不会丢失导航能力：

```ts
for await (const project of client.v2.workspaces.projects.iterate("acme")) {
  await project.states.list(); // 依然是可导航的
}
```

## 一个已加载的行携带了什么

一个可导航的行的类型是 `Loaded<Row, Navigation>`。每一个导航属性都是一个 `Owned<Child, Ids>` 视图：也
就是子资源自己的方法，只是把这一行已经持有的那些 id 从前面去掉了。所以 `eng.states.list()` 就是
`client.v2.workspaces.projects.states.list("acme", "ENG")`，只是两个前置参数已经被填好了。

- **`row.$loaded`** 携带着 `ids`、`idNames` 和 `present`——也就是服务器实际返回的那些字段名的集合。它和
  导航属性都是不可枚举的，所以 `{ ...row }`、`Object.keys(row)` 和 `JSON.stringify(row)` 看到的都是普通
  的 API 行。
- **导航属性永远不会遮蔽字段。** 当一个子项的自然名字已经是这一行的某个字段时，这个属性会被改名，而字段
  会被保留：`estimate.estimatePoints`（因为 `?expand=points` 返回的是一个真实的 `points` 字段）以及
  `property.propertyOptions`（同理，还有 `options`）。构建一个会遮蔽字段的行时会直接抛出异常，而不是悄悄
  隐藏数据。
- **只有方法会在导航中存活下来。** 一个孙辈资源是无法从某个视图访问到的：`project.workItems.comments`
  是不存在的，因为一条评论需要工作项自己的 id，而这个 id 只有被取出的工作项才携带。请先取出这个工作项。

```ts
const project = await client.v2.workspaces.projects.retrieve("acme", "ENG");
console.log(project.$loaded.ids, project.$loaded.present.has("name"));
console.log(JSON.stringify(project)); // 普通的 API 行，没有导航属性
```

## 导航到哪里为止

`wiki` 和 `groupSync` 是分组节点，不是资源：它们不消费任何属于自己的路径 id，所以它们不是某个已取出的
工作区行上的导航属性。要以扁平方式访问它们：`client.v2.workspaces.wiki` 和
`client.v2.workspaces.groupSync`。

`releases.labels` 是唯一一个已加载的行和扁平路径表现不同的地方。这个类同时持有工作区级别的标签目录
（`list`/`create`，只需要 slug）和按发布划分的成员关系桥接。一个已取出的 release 会绑定这个桥接，所以
`release.labels.add(...)` 是可用的，而 `release.labels.list()` 是不能通过类型检查的。要访问目录，请用扁
平方式。

## 导航调用不会缩小 `fields`

一次导航调用会接受 `fields`，但会返回完整的行类型。这是这种形式的唯一限制，也正是扁平路径继续保持公开
的原因。参见 [字段投影](./field-projection.md#navigated-calls-do-not-narrow)。

## 不存在第三种形式

`client.v2.workspace(slug).project(key)`，也就是早期预览版本中携带的那条绑定定位器链，已经被**删除**，
而不是被弃用。它没有绑定任何东西：每个资源都是按调用来传自己的 id 的，所以
`workspace(slug).roles.list(slug)` 把 slug 传了两次。它所持有的每一个家族，现在都已经在 `v2.workspaces`
上了。
