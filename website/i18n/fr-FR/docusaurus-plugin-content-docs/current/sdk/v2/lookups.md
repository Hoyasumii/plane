---
sidebar_position: 5
title: Recherches par clé humaine
description: "Les recherches qui résolvent exactement une ligne côté serveur par nom, slug ou clé, et lèvent une erreur quand aucune ou plusieurs correspondent."
---

# Recherches par clé humaine

Une recherche résout exactement une ligne sur le serveur, et lève une erreur quand il n'y en a pas exactement
une : `NoMatchFoundError` quand rien ne correspond, `MultipleMatchesFoundError` quand plusieurs le font.

- `findByName` partout où l'API filtre sur `name` : états, labels, cycles, modules, projets, espaces
  d'équipe, vues, collections de wiki, types et propriétés d'élément de travail, options et contextes de
  propriété, et plus encore.
- `roles.findBySlug`, `estimates.points.findByKey`, `releases.tags.findByVersion`.
- `customerProperties.findByDisplayName`, à côté de `findByName`.

```ts
await client.v2.workspaces.projects.states.findByName("acme", "ENG", "Todo");
await client.v2.workspaces.roles.findBySlug("acme", "admin", { namespace: "workspace" });
await client.v2.workspaces.projects.estimates.points.findByKey("acme", "ENG", estimateId, 3);
```

Sur les propriétés personnalisées, `name` est la clé machine (par exemple, `story_points`), pas le libellé
affiché dans l'application.

Les deux erreurs étendent `PlaneError`, **pas** `PlaneApiError`, donc attraper `PlaneApiError` seul ne les
attrape pas :

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
