---
sidebar_position: 1
title: API-v2-Übersicht
description: "Die API-v2-Oberfläche unter client.v2: 90 Ressourcen, Pfad-IDs als führende Positionsparameter und die Standard-Methodennamen."
---

# API-v2-Übersicht

`client.v2` erreicht die v2-Oberfläche: 90 Ressourcenklassen, generiert anhand von Planes api_v2-OpenAPI-
Dokument. Die v1-Ressourcen am Client sind unverändert (siehe [API v1](../v1.md)).

Es gibt **zwei Zugangswege**, und es sind auf beiden dieselben Ressourcen:

1. **Der flache Pfad.** Jede Ressource ist ein Attribut, und jede ID ist ein Argument.
2. **Geladene Zeilen.** Eine geladene Zeile ist der Ort, an dem ihre Kinder leben. Siehe
   [Geladene Zeilen](./loaded-rows.md).

## Der flache Pfad

Eine Ressource hängt am Namespace an der Position, die ihre URL vorgibt, und nimmt die von ihrer URL benannten
IDs als **führende positionale Argumente** entgegen, in Pfadreihenfolge:

```ts
import { PlaneClient } from "@hoyasumii/plane";

const client = new PlaneClient({ baseUrl: "https://api.plane.so", apiKey: "..." });

// GET /workspaces/acme/projects/ENG/states/
await client.v2.workspaces.projects.states.list("acme", "ENG");

// GET /workspaces/acme/projects/ENG/work-items/wi-1/comments/
await client.v2.workspaces.projects.workItems.comments.list("acme", "ENG", "wi-1");

// GET /workspaces/acme/teamspaces/
await client.v2.workspaces.teamspaces.list("acme");
```

`v2.workspaces` und `v2.workspaces.projects` sind die zwei Wurzeln. Jede Ressource sitzt an genau einem
Attributpfad, dem, den ihre URL benennt: eine Ressource auf Arbeitsbereichsebene unter `v2.workspaces`, eine
auf Projektebene unter `v2.workspaces.projects`.

`project` akzeptiert die UUID eines Projekts **oder** seinen lesbaren Bezeichner (`"ENG"`). Ein Work Item kann
über seinen menschenlesbaren Schlüssel mit `retrieveByIdentifier` erreicht werden. Keine v2-Methode nimmt ein
`workspaceSlug`- oder `project`-Optionsobjekt entgegen: Path-IDs sind positional und immer zuerst, in
URL-Reihenfolge, und alles andere lebt im nachgestellten `params`-Objekt.

```ts
// ENG-123, ohne vorher sein Projekt zu kennen.
const item = await client.v2.workspaces.workItems.retrieveByIdentifier("acme", "ENG-123");
console.log(item.name);
```

## Die Standardmethoden

Die meisten Ressourcen stellen einige derselben Verben bereit, jeweils mit ihren Path-IDs zuerst:

| Methode                                    | Was sie tut                                                                        |
| ------------------------------------------ | ---------------------------------------------------------------------------------- |
| `list(...ids, params?)`                    | eine Seite von Zeilen ([Pagination](./pagination.md))                              |
| `iterate(...ids, params?)`                 | ein asynchroner Iterator, der die Seiten für dich durchläuft                       |
| `retrieve(...ids, id, params?)`            | eine Zeile                                                                         |
| `create(...ids, data, params?)`            | eine neue Zeile                                                                    |
| `update(...ids, id, data, params?)`        | eine Teilaktualisierung                                                            |
| `upsert(...ids, data, params?)`            | erstellt oder aktualisiert die Zeile mit derselben `external_source`/`external_id` |
| `delete(...ids, id)`                       | entfernt die Zeile                                                                 |
| `archive` / `unarchive`                    | auf Projekten und Work Items                                                       |
| `bulkCreate` / `bulkUpdate` / `bulkDelete` | Batches ([Memberships und Bulk-Schreibvorgänge](./memberships-and-bulk.md))        |
| `findByName` und andere `findBy*`          | genau eine Zeile per menschenlesbarem Schlüssel ([Lookups](./lookups.md))          |

Lese- und Schreibvorgänge, die `fields` akzeptieren, schränken ihren Rückgabetyp auf die angeforderten Felder
ein ([Feldprojektion](./field-projection.md)). `expand` fügt verwandte Objekte inline ein, und `order_by` wird
gegen die eigenen Sortierreihenfolgen der Operation geprüft.

## Generierte Daten

`v2.FIELDS`, `v2.EXPAND` und `v2.ORDER_BY` sind die vollständigen Operation-ID-zu-erlaubte-Werte-Maps, gegen
die die Encoder validieren (zum Beispiel listet `v2.FIELDS["states_list"]` jedes Feld auf, das `states.list`
akzeptiert). `v2.OPENAPI_VERSION` ist die Version des api_v2-Dokuments, aus der das SDK generiert wurde. Alle
davon, plus die beiden Obergrenzen `v2.BULK_MAX_ITEMS` und `v2.BRIDGE_MAX_IDS`, werden exportiert, sodass du
gültige Werte aufzählen kannst, statt zu raten.

```ts
import { v2 } from "@hoyasumii/plane";

console.log(v2.OPENAPI_VERSION, v2.FIELDS["states_list"]);
```
