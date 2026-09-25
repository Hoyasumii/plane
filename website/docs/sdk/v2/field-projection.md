---
sidebar_position: 3
title: Field projection
---

# Field projection

`fields` narrows the **return type**, not just the response. Ask for two fields and the row you get back has
those two plus `id`. Reading anything else is a compile error, not an `undefined` at runtime:

```ts
const page = await client.v2.workspaces.projects.states.list("acme", "ENG", { fields: ["id", "name"] });
for (const state of page.data) {
  console.log(state.id, state.name); // typed: only id/name exist on this row
  // console.log(state.color);       // compile error: `color` was not requested
}
```

An inline array literal needs no `as const`. The same holds for `iterate` and `retrieve`, and, since it is
the same claim, for **writes**: `create`, `update` and `upsert` accept `fields` and narrow their answer the
same way.

```ts
const created = await client.v2.workspaces.projects.states.create(
  "acme",
  "ENG",
  { name: "In Review", color: "#4ECDC4" },
  { fields: ["id", "name"] }
);
console.log(created.name); // narrowed; `created.color` would not compile
```

## Field lists built at runtime

A field list built at runtime (not a literal) must still be typed as field names. Plain `string[]` is **not**
assignable to `readonly StateField[]` and fails with a long overload-mismatch error. The row is narrowed to the
list's **element type**, so type the variable as narrowly as you actually use it:

```ts
import { PlaneClient, v2 } from "@hoyasumii/plane";

const client = new PlaneClient({ baseUrl: "https://api.plane.so", apiKey: "..." });

// Narrowed to these two names, even though the value is chosen at run time.
const wanted: ("id" | "name")[] = includeColor ? ["id", "name"] : ["id"];
const page = await client.v2.workspaces.projects.states.list("acme", "ENG", { fields: wanted });

// Typed as the whole union instead, this narrows to "every field", i.e. the full row.
const anything: v2.StateField[] = includeColor ? ["id", "name", "color"] : ["id", "name"];
const unnarrowed = await client.v2.workspaces.projects.states.list("acme", "ENG", { fields: anything });
```

`"all"` is a legal field value meaning "every field", and it correctly yields the full row type.

Sparse responses mean every read field except `id` is optional in the models. Check for `undefined` rather
than assuming presence. When the list was built dynamically, `row.$loaded.present` tells you what actually
came back.

## Navigated calls do not narrow

**This limitation is the reason the flat form stays public.** A navigated call resolves against the general
signature, so it accepts `fields` but does **not** narrow:

```ts
const eng = await client.v2.workspaces.projects.retrieve("acme", "ENG");
const listed = await eng.states.list({ fields: ["id", "name"] }); // Page<State>, not narrowed
```

TypeScript erases a type parameter when it infers through the conditional type behind a navigation property,
so the narrowing overload cannot be carried across. Matching the overload set instead would be worse, not
better: the inference would erase `F` to its constraint and claim _every_ field is present. When you want the
narrowed row, call the resource flat:
`client.v2.workspaces.projects.states.list("acme", "ENG", { fields: [...] })`.

## `expand` and `order_by`

`expand` inlines related objects (`{ expand: ["state", "labels"] }` on a work item), validated against the
operation's allowed values in `v2.EXPAND`.

`order_by` is validated the same way `fields` is, against a generated union (`StateOrderBy`, `LabelOrderBy`,
…). A literal outside that union is a compile error, and a value built at runtime is rejected client-side by
`encodeOrderBy` rather than reaching the server as a 400.

```ts
await client.v2.workspaces.projects.states.list("acme", "ENG", { order_by: "-created_at" });
```
