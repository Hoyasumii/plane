---
sidebar_position: 9
title: 类型
description: "API v2 类型的位置：v2 和 v2models 命名空间，以及包根部带 V2 前缀的别名。"
---

# 类型

v2 的类型可以通过 `v2` 和 `v2models` 这两个命名空间访问到（例如 `v2models.State` 和 `v2.StateField`）。
最常用的那些还在包的根部有别名：`V2Label`、`V2State`、`V2Project`、`V2Workspace`、`V2WorkItem`、
`V2Cycle`、`V2Module`、`V2Milestone`、`V2ListStatesParams` 和 `V2ListLabelsParams`，以及
`V2Create*`/`V2Update*` 这些请求模型。

请使用这些名字。v2 那些不带前缀的 `Label`/`State`/`Project`/`Workspace`/`Page` 名字，在打包出来的类型定
义中会和 v1 的同名类型冲突，所以 `import { Workspace } from "@hoyasumii/plane"` 解析出来的是**v1**的形
状，不是 v2 的。`V2Page` 是 wiki 页面模型，分页信封 `Page<T>` 则被单独取了个别名，叫 `V2PageEnvelope`。

```ts
import type { V2PageEnvelope, V2State, v2, v2models } from "@hoyasumii/plane";

const fields: v2.StateField[] = ["id", "name"];
const page: V2PageEnvelope<V2State> = await client.v2.workspaces.projects.states.list("acme", "ENG");
const first: v2models.State | undefined = page.data[0];
```

一个可导航行会解析出来的类型，同样是在 `v2` 下导出的：`v2.LoadedProject`、`v2.ProjectNavigation`、
`v2.ProjectIds`、`v2.PROJECT_ID_NAMES`，以及每个家族对应的同一套类型，加上内核类型
`v2.Loaded`、`v2.Owned` 和 `v2.LoadedMeta`。

读取模型里除了 `id` 之外的每一个字段都是可选的，因为 `?fields=` 和集合的延迟加载都可能省略掉任何字段。

完整的导出类、模型和辅助函数列表，请参见 [API 参考](pathname://../../../../docs/api)。
