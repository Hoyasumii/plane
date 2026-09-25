---
sidebar_position: 7
title: Wiki
---

# Wiki

`v2.workspaces.wiki` groups the workspace wiki:

- `v2.workspaces.wiki.pages` is every global page in the workspace. A project's pages are
  `v2.workspaces.projects.pages` instead.
- `v2.workspaces.wiki.collections` is the wiki's collections, with their `members` bridge.

A page write's `collection_id` can be omitted for a public page, which lands in the workspace's default
"General" collection. A private page needs an explicit `collection_id` of a collection the caller owns.

```ts
const wiki = client.v2.workspaces.wiki;

await wiki.pages.create("acme", { name: "Handbook" }); // public page -> default collection
const handbook = await wiki.collections.findByName("acme", "Engineering handbook");
await wiki.pages.create("acme", { name: "Runbook", collection_id: handbook.id });
await wiki.collections.default("acme"); // the default collection, resolved via `is_default`
```

`wiki` and `groupSync` are grouping nodes, not resources: they consume no path id of their own, so they are not
navigation properties on a fetched workspace row. Reach them flat.

The wiki page model is exported as `V2Page` from the package root, and as `v2models.Page`.
