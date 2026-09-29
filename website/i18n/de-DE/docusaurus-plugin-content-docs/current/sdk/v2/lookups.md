---
sidebar_position: 5
title: Lookups per menschenlesbarem Schlüssel
description: "Lookups, die serverseitig genau eine Zeile über Name, Slug oder Schlüssel auflösen und einen Fehler werfen, wenn keine oder mehrere passen."
---

# Lookups per menschenlesbarem Schlüssel

Ein Lookup löst genau eine Zeile auf dem Server auf und löst einen Fehler aus, wenn es nicht genau eine gibt:
`NoMatchFoundError`, wenn nichts passt, `MultipleMatchesFoundError`, wenn mehrere passen.

- `findByName` überall, wo die API nach `name` filtert: States, Labels, Cycles, Module, Projekte, Teamspaces,
  Views, Wiki-Collections, Work-Item-Typen und -Eigenschaften, Eigenschaftsoptionen und -kontexte und mehr.
- `roles.findBySlug`, `estimates.points.findByKey`, `releases.tags.findByVersion`.
- `customerProperties.findByDisplayName`, neben `findByName`.

```ts
await client.v2.workspaces.projects.states.findByName("acme", "ENG", "Todo");
await client.v2.workspaces.roles.findBySlug("acme", "admin", { namespace: "workspace" });
await client.v2.workspaces.projects.estimates.points.findByKey("acme", "ENG", estimateId, 3);
```

Bei benutzerdefinierten Eigenschaften ist `name` der maschinenlesbare Schlüssel (zum Beispiel `story_points`),
nicht das in der App angezeigte Label.

Beide Fehler erweitern `PlaneError`, **nicht** `PlaneApiError`, sodass das Abfangen von `PlaneApiError` allein
sie nicht abfängt:

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
