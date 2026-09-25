---
sidebar_position: 4
title: Memberships and bulk writes
---

# Memberships and bulk writes

**There are two batch caps, and they are different numbers.**

| Batch               | Cap                            | Methods                                          |
| ------------------- | ------------------------------ | ------------------------------------------------ |
| A membership bridge | `v2.BRIDGE_MAX_IDS` (100) ids  | `add` / `remove` (and `link` on type properties) |
| A bulk write        | `v2.BULK_MAX_ITEMS` (50) items | `bulkCreate` / `bulkUpdate` / `bulkDelete`       |

The first is the golden's `maxItems` on the 24 `add`/`remove` schemas, the second its `maxItems` on the 21 bulk
create/update/delete schemas. Sizing a bridge call at 50 works but wastes half of each round trip; sizing a bulk
call at 100 throws client-side.

## Memberships

Memberships are `add`/`remove` on a sub-resource named for the thing being added: path ids first, then
1..100 ids (`BRIDGE_MAX_IDS`). An empty or oversized list throws before any request. Each call sends only its
own verb and resolves to the ids the server actually changed.

```ts
const v2ns = client.v2;

await v2ns.workspaces.projects.cycles.workItems.add("acme", "ENG", cycleId, [itemId]); // -> ["<item id>"]
await v2ns.workspaces.projects.modules.workItems.remove("acme", "ENG", moduleId, [itemId]);
await v2ns.workspaces.releases.labels.add("acme", releaseId, [labelId]);
await v2ns.workspaces.initiatives.projects.add("acme", initiativeId, [projectId]);
await v2ns.workspaces.wiki.collections.members.add("acme", collectionId, [{ member_id: userId, access: 1 }]);
```

Properties on a work item type use `link`/`unlink` instead, matching the web app. `unlink` deletes that
property's values on every work item of the type.

```ts
await client.v2.workspaces.projects.workItemTypes.properties.link("acme", "ENG", typeId, [propertyId]);
await client.v2.workspaces.projects.workItemTypes.properties.unlink("acme", "ENG", typeId, propertyId);
```

## Bulk writes

`bulkCreate` / `bulkUpdate` / `bulkDelete` always answer HTTP 200, even when some rows fail: partial success is
the default. The answer counts `succeeded` and `failed` and has one entry per row in `results`. Call
`v2.raiseForFailures(result)` to throw a `PlaneApiError` carrying the first failure's `errors`, or read the
failed rows with `v2.bulkFailures(result)`.

The cap is 50 items per call (`BULK_MAX_ITEMS`), not the 100 a membership bridge takes. An empty batch is
rejected client-side rather than being a silent no-op.

```ts
import { v2 } from "@hoyasumii/plane";

const result = await client.v2.workspaces.projects.states.bulkCreate("acme", "ENG", [{ name: "QA", color: "#ffffff" }]);
v2.raiseForFailures(result);

// Each bulkUpdate item is the patch plus the target id.
await client.v2.workspaces.projects.states.bulkUpdate("acme", "ENG", [{ id: "state-1", color: "#000000" }]);
```

Every bulk method takes a last `allOrNone` argument (default `false`). Pass `true` to ask the server to apply
every row or none of them.

To write more than 50 rows, split them yourself:

```ts
import { v2, v2models } from "@hoyasumii/plane";

const rows: v2models.CreateState[] = [{ name: "QA", color: "#ffffff" }];

for (let start = 0; start < rows.length; start += v2.BULK_MAX_ITEMS) {
  const chunk = rows.slice(start, start + v2.BULK_MAX_ITEMS);
  v2.raiseForFailures(await client.v2.workspaces.projects.states.bulkCreate("acme", "ENG", chunk));
}
```
