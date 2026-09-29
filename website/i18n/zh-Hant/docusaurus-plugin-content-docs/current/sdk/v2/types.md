---
sidebar_position: 9
title: 型別
description: "API v2 型別的位置：v2 與 v2models 命名空間，以及套件根部帶 V2 前綴的別名。"
---

# 型別

v2 的型別可以透過 `v2` 和 `v2models` 這兩個名稱空間存取到（例如 `v2models.State` 和 `v2.StateField`）。
最常用的那些還在包的根部有別名：`V2Label`、`V2State`、`V2Project`、`V2Workspace`、`V2WorkItem`、
`V2Cycle`、`V2Module`、`V2Milestone`、`V2ListStatesParams` 和 `V2ListLabelsParams`，以及
`V2Create*`/`V2Update*` 這些請求模型。

請使用這些名字。v2 那些不帶字首的 `Label`/`State`/`Project`/`Workspace`/`Page` 名字，在打包出來的型別定
義中會和 v1 的同名型別衝突，所以 `import { Workspace } from "@hoyasumii/plane"` 解析出來的是**v1**的形
狀，不是 v2 的。`V2Page` 是 wiki 頁面模型，分頁信封 `Page<T>` 則被單獨取了個別名，叫 `V2PageEnvelope`。

```ts
import type { V2PageEnvelope, V2State, v2, v2models } from "@hoyasumii/plane";

const fields: v2.StateField[] = ["id", "name"];
const page: V2PageEnvelope<V2State> = await client.v2.workspaces.projects.states.list("acme", "ENG");
const first: v2models.State | undefined = page.data[0];
```

一個可導航行會解析出來的型別，同樣是在 `v2` 下匯出的：`v2.LoadedProject`、`v2.ProjectNavigation`、
`v2.ProjectIds`、`v2.PROJECT_ID_NAMES`，以及每個家族對應的同一套型別，加上核心型別
`v2.Loaded`、`v2.Owned` 和 `v2.LoadedMeta`。

讀取模型裡除了 `id` 之外的每一個欄位都是可選的，因為 `?fields=` 和集合的延遲載入都可能省略掉任何欄位。

完整的匯出類、模型和輔助函式列表，請參見 [API 參考](pathname://../../../../docs/api)。
