---
sidebar_position: 9
title: Types
---

# Types

v2 types are reachable through the `v2` and `v2models` namespaces (for example, `v2models.State` and
`v2.StateField`). The most common ones are also aliased at the package root: `V2Label`, `V2State`,
`V2Project`, `V2Workspace`, `V2WorkItem`, `V2Cycle`, `V2Module`, `V2Milestone`, `V2ListStatesParams` and
`V2ListLabelsParams`, and the `V2Create*`/`V2Update*` request models.

Use those names. v2's bare `Label`/`State`/`Project`/`Workspace`/`Page` names collide with v1's in the bundled
type definitions, so `import { Workspace } from "@hoyasumii/plane"` resolves to **v1's** shape, not v2's.
`V2Page` is the wiki page model, and the pagination envelope `Page<T>` is aliased separately as
`V2PageEnvelope`.

```ts
import type { V2PageEnvelope, V2State, v2, v2models } from "@hoyasumii/plane";

const fields: v2.StateField[] = ["id", "name"];
const page: V2PageEnvelope<V2State> = await client.v2.workspaces.projects.states.list("acme", "ENG");
const first: v2models.State | undefined = page.data[0];
```

The types a navigable row resolves to are exported under `v2` too: `v2.LoadedProject`, `v2.ProjectNavigation`,
`v2.ProjectIds`, `v2.PROJECT_ID_NAMES`, and the same set for each family, plus the `v2.Loaded`, `v2.Owned` and
`v2.LoadedMeta` kernel types.

Read models mark every field except `id` optional, because `?fields=` and collection deferral can omit any of
them.

For the full list of exported classes, models and helpers, see the [API reference](/docs/api).
