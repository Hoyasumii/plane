---
sidebar_position: 7
title: Wiki
description: "Das Workspace-Wiki in API v2: globale Seiten, Collections und ihre Mitglieder, unter v2.workspaces.wiki."
---

# Wiki

`v2.workspaces.wiki` gruppiert das Arbeitsbereichs-Wiki:

- `v2.workspaces.wiki.pages` ist jede globale Seite im Arbeitsbereich. Die Seiten eines Projekts sind
  stattdessen `v2.workspaces.projects.pages`.
- `v2.workspaces.wiki.collections` sind die Collections des Wikis, mit ihrer `members`-Bridge.

Das `collection_id` einer Seitenerstellung kann für eine öffentliche Seite ausgelassen werden, die dann in der
Standard-Collection "General" des Arbeitsbereichs landet. Eine private Seite braucht eine explizite
`collection_id` einer Collection, die dem Aufrufer gehört.

```ts
const wiki = client.v2.workspaces.wiki;

await wiki.pages.create("acme", { name: "Handbook" }); // öffentliche Seite -> Standard-Collection
const handbook = await wiki.collections.findByName("acme", "Engineering handbook");
await wiki.pages.create("acme", { name: "Runbook", collection_id: handbook.id });
await wiki.collections.default("acme"); // die Standard-Collection, aufgelöst über `is_default`
```

`wiki` und `groupSync` sind Gruppierungsknoten, keine Ressourcen: Sie verbrauchen keine eigene Path-ID, daher
sind sie keine Navigationseigenschaften auf einer geladenen Arbeitsbereichszeile. Erreiche sie flach.

Das Wiki-Seitenmodell wird als `V2Page` vom Paketstamm exportiert, und als `v2models.Page`.
