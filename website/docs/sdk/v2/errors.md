---
sidebar_position: 8
title: Errors
---

# Errors

Every error the SDK raises extends `PlaneError`, and every class below is exported from the package root.

| Error                       | Raised by | When                                                                             |
| --------------------------- | --------- | -------------------------------------------------------------------------------- |
| `PlaneApiError`             | v2        | the API answered an error: an RFC 9457 problem detail                            |
| `NoMatchFoundError`         | v2        | a `findBy*` lookup matched nothing                                               |
| `MultipleMatchesFoundError` | v2        | a `findBy*` lookup matched more than one row                                     |
| `PlaneNetworkError`         | v2        | the request never reached a server: connection refused, DNS failure, timeout, …  |
| `MissingPathIdError`        | v2        | a URL cannot be built because a path id is missing                               |
| `HttpError`                 | v1        | a v1 request failed: the status code, the response body and the response headers |
| `AttachmentTooLargeError`   | v1        | `workItems.attachments.download` passed its `maxBytes`                           |

All seven extend `PlaneError` directly. In particular the lookup errors are **not** subclasses of
`PlaneApiError`, so catching that alone does not catch them.

## `PlaneApiError`

`PlaneApiError` carries the problem detail as `.status`, `.type`, `.code`, `.detail` and `.errors`, the last
being the per-field validation errors when the server sent them.

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

A bulk write answers HTTP 200 even when rows fail. `v2.raiseForFailures(result)` turns a failure into a
`PlaneApiError` (see [Memberships and bulk writes](./memberships-and-bulk.md#bulk-writes)).
