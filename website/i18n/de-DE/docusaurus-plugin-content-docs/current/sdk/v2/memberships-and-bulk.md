---
sidebar_position: 4
title: Memberships und Bulk-Schreibvorgänge
description: "Mitgliedschaftsbrücken (add und remove, bis zu 100 IDs) und Bulk-Schreibvorgänge (bis zu 50 Elemente) in API v2, und warum die Obergrenzen verschieden sind."
---

# Memberships und Bulk-Schreibvorgänge

**Es gibt zwei Batch-Obergrenzen, und es sind unterschiedliche Zahlen.**

| Batch                   | Obergrenze                        | Methoden                                            |
| ----------------------- | --------------------------------- | --------------------------------------------------- |
| Eine Membership-Bridge  | `v2.BRIDGE_MAX_IDS` (100) IDs     | `add` / `remove` (und `link` bei Typ-Eigenschaften) |
| Ein Bulk-Schreibvorgang | `v2.BULK_MAX_ITEMS` (50) Elemente | `bulkCreate` / `bulkUpdate` / `bulkDelete`          |

Die erste ist das `maxItems` des Goldens auf den 24 `add`/`remove`-Schemas, die zweite sein `maxItems` auf den
21 Bulk-Create/Update/Delete-Schemas. Einen Bridge-Aufruf mit 50 zu dimensionieren funktioniert, verschwendet
aber die Hälfte jedes Roundtrips; einen Bulk-Aufruf mit 100 zu dimensionieren löst clientseitig einen Fehler
aus.

## Memberships

Memberships sind `add`/`remove` auf einer Unterressource, benannt nach dem, was hinzugefügt wird: zuerst
Path-IDs, dann 1..100 IDs (`BRIDGE_MAX_IDS`). Eine leere oder zu große Liste löst einen Fehler aus, bevor
irgendeine Anfrage gesendet wird. Jeder Aufruf sendet nur sein eigenes Verb und löst zu den IDs auf, die der
Server tatsächlich geändert hat.

```ts
const v2ns = client.v2;

await v2ns.workspaces.projects.cycles.workItems.add("acme", "ENG", cycleId, [itemId]); // -> ["<item id>"]
await v2ns.workspaces.projects.modules.workItems.remove("acme", "ENG", moduleId, [itemId]);
await v2ns.workspaces.releases.labels.add("acme", releaseId, [labelId]);
await v2ns.workspaces.initiatives.projects.add("acme", initiativeId, [projectId]);
await v2ns.workspaces.wiki.collections.members.add("acme", collectionId, [{ member_id: userId, access: 1 }]);
```

Eigenschaften auf einem Work-Item-Typ nutzen stattdessen `link`/`unlink`, passend zur Web-App. `unlink` löscht
die Werte dieser Eigenschaft auf jedem Work Item des Typs.

```ts
await client.v2.workspaces.projects.workItemTypes.properties.link("acme", "ENG", typeId, [propertyId]);
await client.v2.workspaces.projects.workItemTypes.properties.unlink("acme", "ENG", typeId, propertyId);
```

## Bulk-Schreibvorgänge

`bulkCreate` / `bulkUpdate` / `bulkDelete` antworten immer mit HTTP 200, selbst wenn einige Zeilen fehlschlagen:
Teilerfolg ist der Standard. Die Antwort zählt `succeeded` und `failed` und hat einen Eintrag pro Zeile in
`results`. Rufe `v2.raiseForFailures(result)` auf, um einen `PlaneApiError` mit den `errors` des ersten
Fehlschlags auszulösen, oder lies die fehlgeschlagenen Zeilen mit `v2.bulkFailures(result)`.

Die Obergrenze liegt bei 50 Elementen pro Aufruf (`BULK_MAX_ITEMS`), nicht bei den 100, die eine
Membership-Bridge nimmt. Ein leerer Batch wird clientseitig abgelehnt, statt ein stiller No-op zu sein.

```ts
import { v2 } from "@hoyasumii/plane";

const result = await client.v2.workspaces.projects.states.bulkCreate("acme", "ENG", [{ name: "QA", color: "#ffffff" }]);
v2.raiseForFailures(result);

// Jedes bulkUpdate-Element ist der Patch plus die Ziel-ID.
await client.v2.workspaces.projects.states.bulkUpdate("acme", "ENG", [{ id: "state-1", color: "#000000" }]);
```

Jede Bulk-Methode nimmt ein letztes `allOrNone`-Argument entgegen (Standard `false`). Übergib `true`, um den
Server zu bitten, jede Zeile oder keine von ihnen anzuwenden.

Um mehr als 50 Zeilen zu schreiben, teile sie selbst auf:

```ts
import { v2, v2models } from "@hoyasumii/plane";

const rows: v2models.CreateState[] = [{ name: "QA", color: "#ffffff" }];

for (let start = 0; start < rows.length; start += v2.BULK_MAX_ITEMS) {
  const chunk = rows.slice(start, start + v2.BULK_MAX_ITEMS);
  v2.raiseForFailures(await client.v2.workspaces.projects.states.bulkCreate("acme", "ENG", chunk));
}
```
