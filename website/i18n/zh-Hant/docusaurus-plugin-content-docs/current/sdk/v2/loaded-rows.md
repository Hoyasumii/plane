---
sidebar_position: 2
title: 已載入的行
description: "API v2 中的可導覽列：取得的列會攜帶自身的 id，因此存取其子資源時不必再次傳入。"
---

# 已載入的行

一個有子項的資源，其每一個會返回行的方法都會給出**可導航的行**：這一行自身的資料，加上每個子項對應的一
個屬性，且產生它所需的那些 id 已經提供好了。這就是「id 消費」規則：_一個 id 只在它被知道的那一刻傳遞一
次_。一個沒有子項的資源（`states`、`labels`、`roles`）會返回普通模型，因為沒有什麼可以從它那裡再往下走。

```ts
const workspace = await client.v2.workspaces.retrieve("acme");

await workspace.projects.list(); // 不需要 slug
await workspace.teamspaces.list(); // 不需要 slug

// 而且可以繼續鏈下去：一個已取出的專案攜帶著這兩個 id。
const eng = await workspace.projects.retrieve("ENG");
await eng.states.list(); // 不需要 slug，也不需要 project 鍵
await eng.workItems.create({ name: "Fix login bug", state: "Todo", labels: ["bug"] });

// 深入三層：一個已取出的工作項目攜帶著全部三個 id。
const item = await eng.workItems.retrieve("wi-1");
await item.comments.list();
```

鏈式呼叫之所以可行，是因為一行「知道是哪些 id 把它取出來的」。`list` 和 `iterate` 返回的也是可導航的行，
所以翻頁不會丟失導航能力：

```ts
for await (const project of client.v2.workspaces.projects.iterate("acme")) {
  await project.states.list(); // 依然是可導航的
}
```

## 一個已載入的行攜帶了什麼

一個可導航的行的型別是 `Loaded<Row, Navigation>`。每一個導航屬性都是一個 `Owned<Child, Ids>` 檢視：也
就是子資源自己的方法，只是把這一行已經持有的那些 id 從前面去掉了。所以 `eng.states.list()` 就是
`client.v2.workspaces.projects.states.list("acme", "ENG")`，只是兩個前置引數已經被填好了。

- **`row.$loaded`** 攜帶著 `ids`、`idNames` 和 `present`——也就是伺服器實際返回的那些欄位名的集合。它和
  導航屬性都是不可列舉的，所以 `{ ...row }`、`Object.keys(row)` 和 `JSON.stringify(row)` 看到的都是普通
  的 API 行。
- **導航屬性永遠不會遮蔽欄位。** 當一個子項的自然名字已經是這一行的某個欄位時，這個屬性會被改名，而欄位
  會被保留：`estimate.estimatePoints`（因為 `?expand=points` 返回的是一個真實的 `points` 欄位）以及
  `property.propertyOptions`（同理，還有 `options`）。構建一個會遮蔽欄位的行時會直接丟擲異常，而不是悄悄
  隱藏資料。
- **只有方法會在導航中存活下來。** 一個孫輩資源是無法從某個檢視存取到的：`project.workItems.comments`
  是不存在的，因為一條評論需要工作項目自己的 id，而這個 id 只有被取出的工作項目才攜帶。請先取出這個工作項目。

```ts
const project = await client.v2.workspaces.projects.retrieve("acme", "ENG");
console.log(project.$loaded.ids, project.$loaded.present.has("name"));
console.log(JSON.stringify(project)); // 普通的 API 行，沒有導航屬性
```

## 導航到哪裡為止

`wiki` 和 `groupSync` 是分組節點，不是資源：它們不消費任何屬於自己的路徑 id，所以它們不是某個已取出的
工作區行上的導航屬性。要以扁平方式存取它們：`client.v2.workspaces.wiki` 和
`client.v2.workspaces.groupSync`。

`releases.labels` 是唯一一個已載入的行和扁平路徑表現不同的地方。這個類同時持有工作區級別的標籤目錄
（`list`/`create`，只需要 slug）和按釋出劃分的成員關係橋接。一個已取出的 release 會繫結這個橋接，所以
`release.labels.add(...)` 是可用的，而 `release.labels.list()` 是不能透過型別檢查的。要存取目錄，請用扁
平方式。

## 導航呼叫不會縮小 `fields`

一次導航呼叫會接受 `fields`，但會返回完整的行型別。這是這種形式的唯一限制，也正是扁平路徑繼續保持公開
的原因。參見 [欄位投影](./field-projection.md#navigated-calls-do-not-narrow)。

## 不存在第三種形式

`client.v2.workspace(slug).project(key)`，也就是早期預覽版本中攜帶的那條繫結定位器鏈，已經被**刪除**，
而不是被棄用。它沒有繫結任何東西：每個資源都是按呼叫來傳自己的 id 的，所以
`workspace(slug).roles.list(slug)` 把 slug 傳了兩次。它所持有的每一個家族，現在都已經在 `v2.workspaces`
上了。
