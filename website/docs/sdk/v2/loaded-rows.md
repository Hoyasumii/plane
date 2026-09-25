---
sidebar_position: 2
title: Loaded rows
---

# Loaded rows

A resource that has children answers **navigable rows** from every row-returning method: the row's own data,
plus one property per child, with the ids that produced it already supplied. This is the id-consumption rule:
_an id is passed once, at the point it is known_. A resource with no children (`states`, `labels`, `roles`)
answers the plain model, since there is nothing to reach from it.

```ts
const workspace = await client.v2.workspaces.retrieve("acme");

await workspace.projects.list(); // no slug
await workspace.teamspaces.list(); // no slug

// And it chains: a fetched project carries both ids.
const eng = await workspace.projects.retrieve("ENG");
await eng.states.list(); // no slug, no project key
await eng.workItems.create({ name: "Fix login bug", state: "Todo", labels: ["bug"] });

// Three levels deep: a fetched work item carries all three.
const item = await eng.workItems.retrieve("wi-1");
await item.comments.list();
```

Chaining works because a row _knows which ids fetched it_. `list` and `iterate` hand back navigable rows too,
so paging does not lose navigation:

```ts
for await (const project of client.v2.workspaces.projects.iterate("acme")) {
  await project.states.list(); // still navigable
}
```

## What a loaded row carries

A navigable row has the type `Loaded<Row, Navigation>`. Each navigation property is an `Owned<Child, Ids>`
view: the child resource's own methods, with the ids the row already holds dropped from the front. So
`eng.states.list()` is `client.v2.workspaces.projects.states.list("acme", "ENG")` with both leading
arguments supplied.

- **`row.$loaded`** carries `ids`, `idNames` and `present`, the set of field names the server actually
  returned. It and the navigation properties are non-enumerable, so `{ ...row }`, `Object.keys(row)` and
  `JSON.stringify(row)` see the plain API row.
- **A navigation property never shadows a field.** Where a child's natural name is already a field of the row,
  the property is renamed and the field is kept: `estimate.estimatePoints` (because `?expand=points` returns a
  real `points` field) and `property.propertyOptions` (likewise `options`). Building a row that would shadow a
  field throws rather than hiding data.
- **Only methods survive navigation.** A grandchild resource is not reachable from a view:
  `project.workItems.comments` does not exist, because a comment needs a work item's own id, which only a
  fetched work item carries. Fetch the work item first.

```ts
const project = await client.v2.workspaces.projects.retrieve("acme", "ENG");
console.log(project.$loaded.ids, project.$loaded.present.has("name"));
console.log(JSON.stringify(project)); // the plain API row, no navigation
```

## Where navigation stops

`wiki` and `groupSync` are grouping nodes, not resources: they consume no path id of their own, so they are
not navigation properties on a fetched workspace row. Reach them flat, as `client.v2.workspaces.wiki` and
`client.v2.workspaces.groupSync`.

`releases.labels` is the one place where a fetched row and the flat path differ. The class holds both the
workspace-level label catalog (`list`/`create`, slug only) and the per-release membership bridge. A fetched
release binds the bridge, so `release.labels.add(...)` works and `release.labels.list()` does not type-check.
Reach the catalog flat.

## Navigated calls do not narrow `fields`

A navigated call accepts `fields` but answers the full row type. That is the one limitation of this form, and
the reason the flat path stays public. See [Field projection](./field-projection.md#navigated-calls-do-not-narrow).

## There is no third form

`client.v2.workspace(slug).project(key)`, the bound locator chain earlier previews carried, is **deleted**, not
deprecated. It bound nothing: every resource takes its ids per call, so `workspace(slug).roles.list(slug)`
passed the slug twice. Every family it held is on `v2.workspaces` already.
