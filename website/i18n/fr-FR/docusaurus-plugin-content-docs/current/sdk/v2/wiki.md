---
sidebar_position: 7
title: Wiki
description: "Le wiki de l'espace de travail dans l'API v2 : pages globales, collections et leurs membres, sous v2.workspaces.wiki."
---

# Wiki

`v2.workspaces.wiki` regroupe le wiki de l'espace de travail :

- `v2.workspaces.wiki.pages` est chaque page globale de l'espace de travail. Les pages d'un projet sont plutôt
  `v2.workspaces.projects.pages`.
- `v2.workspaces.wiki.collections` sont les collections du wiki, avec leur pont `members`.

Le `collection_id` d'une écriture de page peut être omis pour une page publique, qui atterrit dans la
collection « General » par défaut de l'espace de travail. Une page privée a besoin d'un `collection_id`
explicite d'une collection que l'appelant possède.

```ts
const wiki = client.v2.workspaces.wiki;

await wiki.pages.create("acme", { name: "Handbook" }); // page publique -> collection par défaut
const handbook = await wiki.collections.findByName("acme", "Engineering handbook");
await wiki.pages.create("acme", { name: "Runbook", collection_id: handbook.id });
await wiki.collections.default("acme"); // la collection par défaut, résolue via `is_default`
```

`wiki` et `groupSync` sont des nœuds de regroupement, pas des ressources : ils ne consomment aucun id de
chemin propre, donc ils ne sont pas des propriétés de navigation sur une ligne d'espace de travail chargée.
Atteignez-les de façon plate.

Le modèle de page du wiki est exporté comme `V2Page` depuis la racine du paquet, et comme `v2models.Page`.
