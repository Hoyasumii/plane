---
sidebar_position: 5
title: Lookups by human key
---

# Lookups by human key

A lookup resolves exactly one row on the server, and throws when there is not exactly one:
`NoMatchFoundError` when nothing matches, `MultipleMatchesFoundError` when several do.

- `findByName` wherever the API filters on `name`: states, labels, cycles, modules, projects, teamspaces,
  views, wiki collections, work item types and properties, property options and contexts, and more.
- `roles.findBySlug`, `estimates.points.findByKey`, `releases.tags.findByVersion`.
- `customerProperties.findByDisplayName`, next to `findByName`.

```ts
await client.v2.workspaces.projects.states.findByName("acme", "ENG", "Todo");
await client.v2.workspaces.roles.findBySlug("acme", "admin", { namespace: "workspace" });
await client.v2.workspaces.projects.estimates.points.findByKey("acme", "ENG", estimateId, 3);
```

On custom properties, `name` is the machine key (for example, `story_points`), not the label shown in the app.

Both errors extend `PlaneError`, **not** `PlaneApiError`, so catching `PlaneApiError` alone does not catch
them:

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
