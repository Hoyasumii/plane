---
sidebar_position: 8
title: 错误
description: "SDK 抛出的每个错误都继承自 PlaneError：API 问题详情、查找未命中、网络故障以及无法构建的 URL。"
---

# 错误

SDK 抛出的每一个错误都继承自 `PlaneError`，下面的每一个类都是从包的根部导出的。

| 错误                        | 由谁抛出 | 什么时候                                                     |
| --------------------------- | -------- | ------------------------------------------------------------ |
| `PlaneApiError`             | v2       | API 返回了一个错误：一个 RFC 9457 问题详情（problem detail） |
| `NoMatchFoundError`         | v2       | 一次 `findBy*` 查找没有匹配到任何行                          |
| `MultipleMatchesFoundError` | v2       | 一次 `findBy*` 查找匹配到了多于一行                          |
| `PlaneNetworkError`         | v2       | 请求从未到达服务器：连接被拒绝、DNS 解析失败、超时……         |
| `MissingPathIdError`        | v2       | 因为缺少某个路径 id，URL 无法被构建出来                      |
| `HttpError`                 | v1       | 一次 v1 请求失败：状态码、响应体和响应头                     |
| `AttachmentTooLargeError`   | v1       | `workItems.attachments.download` 超过了它的 `maxBytes`       |

这七个错误都直接继承自 `PlaneError`。需要特别注意的是，查找类错误**不是** `PlaneApiError` 的子类，所以
仅捕获 `PlaneApiError` 并不能捕获它们。

## `PlaneApiError`

`PlaneApiError` 把问题详情携带为 `.status`、`.type`、`.code`、`.detail` 和 `.errors`，其中 `.errors` 是
服务器返回的按字段划分的校验错误。

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

一次批量写入即使某些行失败，也会返回 HTTP 200。`v2.raiseForFailures(result)` 会把一次失败转换成一个
`PlaneApiError`（参见 [成员关系与批量写入](./memberships-and-bulk.md#bulk-writes)）。
