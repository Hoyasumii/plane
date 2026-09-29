---
sidebar_position: 3
title: Feldprojektion
description: "Wie fields den Rückgabetyp zur Kompilierzeit einschränkt, beim Lesen und beim Schreiben, und die eine Stelle, an der die Einschränkung verloren geht."
---

# Feldprojektion

`fields` schränkt den **Rückgabetyp** ein, nicht nur die Antwort. Frage nach zwei Feldern, und die Zeile, die
du zurückbekommst, hat diese beiden plus `id`. Etwas anderes zu lesen ist ein Compile-Fehler, kein `undefined`
zur Laufzeit:

```ts
const page = await client.v2.workspaces.projects.states.list("acme", "ENG", { fields: ["id", "name"] });
for (const state of page.data) {
  console.log(state.id, state.name); // typisiert: auf dieser Zeile gibt es nur id/name
  // console.log(state.color);       // Kompilierfehler: `color` wurde nicht angefordert
}
```

Ein inline geschriebenes Array-Literal braucht kein `as const`. Dasselbe gilt für `iterate` und `retrieve`, und,
da es dieselbe Aussage ist, für **Schreibvorgänge**: `create`, `update` und `upsert` akzeptieren `fields` und
schränken ihre Antwort auf dieselbe Weise ein.

```ts
const created = await client.v2.workspaces.projects.states.create(
  "acme",
  "ENG",
  { name: "In Review", color: "#4ECDC4" },
  { fields: ["id", "name"] }
);
console.log(created.name); // eingeschränkt; `created.color` würde nicht kompilieren
```

## Zur Laufzeit erstellte Feldlisten

Eine zur Laufzeit erstellte Feldliste (kein Literal) muss weiterhin als Feldnamen typisiert sein. Ein einfaches
`string[]` ist **nicht** einem `readonly StateField[]` zuweisbar und schlägt mit einem langen
Overload-Mismatch-Fehler fehl. Die Zeile wird auf den **Elementtyp** der Liste eingeschränkt, also typisiere die
Variable so eng, wie du sie tatsächlich benutzt:

```ts
import { PlaneClient, v2 } from "@hoyasumii/plane";

const client = new PlaneClient({ baseUrl: "https://api.plane.so", apiKey: "..." });

// Auf diese zwei Namen eingeschränkt, obwohl der Wert erst zur Laufzeit feststeht.
const wanted: ("id" | "name")[] = includeColor ? ["id", "name"] : ["id"];
const page = await client.v2.workspaces.projects.states.list("acme", "ENG", { fields: wanted });

// Als ganze Union typisiert, schränkt dies auf „jedes Feld“ ein, also die volle Zeile.
const anything: v2.StateField[] = includeColor ? ["id", "name", "color"] : ["id", "name"];
const unnarrowed = await client.v2.workspaces.projects.states.list("acme", "ENG", { fields: anything });
```

`"all"` ist ein gültiger Feldwert, der "jedes Feld" bedeutet, und liefert korrekt den vollständigen Zeilentyp.

Spärliche Antworten bedeuten, dass in den Modellen jedes Lesefeld außer `id` optional ist. Prüfe auf
`undefined`, statt Anwesenheit anzunehmen. Wenn die Liste dynamisch erstellt wurde, sagt dir
`row.$loaded.present`, was tatsächlich zurückgekommen ist.

## Navigierte Aufrufe grenzen nicht ein

**Diese Einschränkung ist der Grund, warum die flache Form öffentlich bleibt.** Ein navigierter Aufruf löst
gegen die allgemeine Signatur auf, akzeptiert also `fields`, schränkt aber **nicht** ein:

```ts
const eng = await client.v2.workspaces.projects.retrieve("acme", "ENG");
const listed = await eng.states.list({ fields: ["id", "name"] }); // Page<State>, nicht eingeschränkt
```

TypeScript löscht einen Typparameter, wenn es ihn durch den bedingten Typ hinter einer Navigationseigenschaft
ableitet, sodass der einschränkende Overload nicht mitgeführt werden kann. Den Overload-Satz stattdessen
abzugleichen wäre schlechter, nicht besser: Die Ableitung würde `F` auf seine Beschränkung löschen und
behaupten, _jedes_ Feld sei vorhanden. Wenn du die eingeschränkte Zeile willst, rufe die Ressource flach auf:
`client.v2.workspaces.projects.states.list("acme", "ENG", { fields: [...] })`.

## `expand` und `order_by`

`expand` fügt verwandte Objekte inline ein (`{ expand: ["state", "labels"] }` bei einem Work Item), validiert
gegen die erlaubten Werte der Operation in `v2.EXPAND`.

`order_by` wird auf dieselbe Weise validiert wie `fields`, gegen eine generierte Union (`StateOrderBy`,
`LabelOrderBy`, …). Ein Literal außerhalb dieser Union ist ein Compile-Fehler, und ein zur Laufzeit erstellter
Wert wird clientseitig von `encodeOrderBy` abgelehnt, statt als 400 den Server zu erreichen.

```ts
await client.v2.workspaces.projects.states.list("acme", "ENG", { order_by: "-created_at" });
```
