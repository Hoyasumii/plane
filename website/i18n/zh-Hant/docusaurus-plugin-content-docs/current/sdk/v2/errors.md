---
sidebar_position: 8
title: 錯誤
description: "SDK 擲出的每個錯誤都繼承自 PlaneError：API 問題詳情、查詢未命中、網路故障，以及無法建構的 URL。"
---

# 錯誤

SDK 丟擲的每一個錯誤都繼承自 `PlaneError`，下面的每一個類都是從包的根部匯出的。

| 錯誤                        | 由誰丟擲 | 什麼時候                                                     |
| --------------------------- | -------- | ------------------------------------------------------------ |
| `PlaneApiError`             | v2       | API 返回了一個錯誤：一個 RFC 9457 問題詳情（problem detail） |
| `NoMatchFoundError`         | v2       | 一次 `findBy*` 查詢沒有匹配到任何行                          |
| `MultipleMatchesFoundError` | v2       | 一次 `findBy*` 查詢匹配到了多於一行                          |
| `PlaneNetworkError`         | v2       | 請求從未到達伺服器：連線被拒絕、DNS 解析失敗、超時……         |
| `MissingPathIdError`        | v2       | 因為缺少某個路徑 id，URL 無法被構建出來                      |
| `HttpError`                 | v1       | 一次 v1 請求失敗：狀態碼、回應體和回應頭                     |
| `AttachmentTooLargeError`   | v1       | `workItems.attachments.download` 超過了它的 `maxBytes`       |

這七個錯誤都直接繼承自 `PlaneError`。需要特別注意的是，查詢類錯誤**不是** `PlaneApiError` 的子類，所以
僅捕獲 `PlaneApiError` 並不能捕獲它們。

## `PlaneApiError`

`PlaneApiError` 把問題詳情攜帶為 `.status`、`.type`、`.code`、`.detail` 和 `.errors`，其中 `.errors` 是
伺服器返回的按欄位劃分的校驗錯誤。

```ts
import { PlaneApiError, PlaneNetworkError } from "@hoyasumii/plane";

try {
  await client.v2.workspaces.projects.states.create("acme", "ENG", { name: "", color: "#000000" });
} catch (error) {
  if (error instanceof PlaneApiError) {
    console.log(error.status, error.code, error.detail, error.errors);
  } else if (error instanceof PlaneNetworkError) {
    console.log("unreachable:", error.message, error.cause);
  } else {
    throw error;
  }
}
```

一次批次寫入即使某些行失敗，也會返回 HTTP 200。`v2.raiseForFailures(result)` 會把一次失敗轉換成一個
`PlaneApiError`（參見 [成員關係與批次寫入](./memberships-and-bulk.md#bulk-writes)）。
