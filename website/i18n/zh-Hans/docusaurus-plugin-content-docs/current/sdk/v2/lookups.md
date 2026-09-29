---
sidebar_position: 5
title: 按人类可读键查找
description: "在服务器端按名称、slug 或键精确解析一行的查找方法；没有匹配或匹配多于一行时抛出错误。"
---

# 按人类可读键查找

一次查找会在服务器上解析出恰好一行，如果不是恰好一行就会抛出异常：没有匹配到任何东西时抛出
`NoMatchFoundError`，匹配到多行时抛出 `MultipleMatchesFoundError`。

- 在 API 按 `name` 过滤的任何地方都有 `findByName`：状态、标签、迭代周期、模块、项目、团队空间、视图、
  wiki 集合、工作项类型与属性、属性选项与上下文，等等。
- `roles.findBySlug`、`estimates.points.findByKey`、`releases.tags.findByVersion`。
- `customerProperties.findByDisplayName`，和 `findByName` 并列存在。

```ts
await client.v2.workspaces.projects.states.findByName("acme", "ENG", "Todo");
await client.v2.workspaces.roles.findBySlug("acme", "admin", { namespace: "workspace" });
await client.v2.workspaces.projects.estimates.points.findByKey("acme", "ENG", estimateId, 3);
```

对自定义属性来说，`name` 是机器键（例如 `story_points`），不是应用里显示的那个标签。

这两个错误都继承自 `PlaneError`，**不是** `PlaneApiError`，所以仅捕获 `PlaneApiError` 并不能捕获它们：

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
