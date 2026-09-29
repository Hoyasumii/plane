---
sidebar_position: 2
title: Geladene Zeilen
description: "Navigierbare Zeilen in API v2: eine geladene Zeile trägt ihre IDs, ihre Kinder erreichst du also, ohne sie erneut zu übergeben."
---

# Geladene Zeilen

Eine Ressource mit Kindern antwortet auf jede zeilenliefernde Methode mit **navigierbaren Zeilen**: den Daten
der Zeile selbst, plus einer Eigenschaft pro Kind, mit den IDs, die sie erzeugt haben, bereits eingesetzt. Das
ist die Regel des ID-Verbrauchs: _eine ID wird einmal übergeben, an dem Punkt, an dem sie bekannt ist_. Eine
Ressource ohne Kinder (`states`, `labels`, `roles`) antwortet mit dem einfachen Modell, da es nichts gibt, das
von ihr aus erreicht werden könnte.

```ts
const workspace = await client.v2.workspaces.retrieve("acme");

await workspace.projects.list(); // kein Slug
await workspace.teamspaces.list(); // kein Slug

// Und das verkettet sich: ein geladenes Projekt trägt beide IDs.
const eng = await workspace.projects.retrieve("ENG");
await eng.states.list(); // kein Slug, kein Projektschlüssel
await eng.workItems.create({ name: "Fix login bug", state: "Todo", labels: ["bug"] });

// Drei Ebenen tief: ein geladenes Work Item trägt alle drei.
const item = await eng.workItems.retrieve("wi-1");
await item.comments.list();
```

Das Verketten funktioniert, weil eine Zeile _weiß, welche IDs sie geladen haben_. `list` und `iterate` geben
ebenfalls navigierbare Zeilen zurück, sodass das Paging die Navigation nicht verliert:

```ts
for await (const project of client.v2.workspaces.projects.iterate("acme")) {
  await project.states.list(); // weiterhin navigierbar
}
```

## Was eine geladene Zeile trägt

Eine navigierbare Zeile hat den Typ `Loaded<Row, Navigation>`. Jede Navigationseigenschaft ist eine
`Owned<Child, Ids>`-Sicht: die eigenen Methoden der Kind-Ressource, mit den IDs, die die Zeile bereits hat, am
Anfang entfernt. Also ist `eng.states.list()` gleich `client.v2.workspaces.projects.states.list("acme", "ENG")`
mit beiden führenden Argumenten bereits eingesetzt.

- **`row.$loaded`** trägt `ids`, `idNames` und `present`, die Menge der Feldnamen, die der Server tatsächlich
  zurückgegeben hat. Es und die Navigationseigenschaften sind nicht enumerierbar, sodass `{ ...row }`,
  `Object.keys(row)` und `JSON.stringify(row)` die reine API-Zeile sehen.
- **Eine Navigationseigenschaft überdeckt nie ein Feld.** Wo der natürliche Name eines Kindes bereits ein Feld
  der Zeile ist, wird die Eigenschaft umbenannt und das Feld beibehalten: `estimate.estimatePoints` (weil
  `?expand=points` ein echtes `points`-Feld zurückgibt) und `property.propertyOptions` (ebenso für `options`).
  Eine Zeile zu bauen, die ein Feld überdecken würde, löst einen Fehler aus, statt Daten zu verstecken.
- **Nur Methoden überleben die Navigation.** Eine Enkel-Ressource ist von einer Sicht aus nicht erreichbar:
  `project.workItems.comments` existiert nicht, weil ein Kommentar die eigene ID eines Work Items braucht, die
  nur ein geladenes Work Item trägt. Lade zuerst das Work Item.

```ts
const project = await client.v2.workspaces.projects.retrieve("acme", "ENG");
console.log(project.$loaded.ids, project.$loaded.present.has("name"));
console.log(JSON.stringify(project)); // die reine API-Zeile, ohne Navigation
```

## Wo die Navigation endet

`wiki` und `groupSync` sind Gruppierungsknoten, keine Ressourcen: Sie verbrauchen keine eigene Path-ID, daher
sind sie keine Navigationseigenschaften auf einer geladenen Arbeitsbereichszeile. Erreiche sie flach, als
`client.v2.workspaces.wiki` und `client.v2.workspaces.groupSync`.

`releases.labels` ist der einzige Ort, an dem eine geladene Zeile und der flache Pfad sich unterscheiden. Die
Klasse vereint sowohl den Label-Katalog auf Arbeitsbereichsebene (`list`/`create`, nur mit Slug) als auch die
Membership-Bridge pro Release. Ein geladenes Release bindet die Bridge, sodass `release.labels.add(...)`
funktioniert und `release.labels.list()` nicht typprüft. Erreiche den Katalog flach.

## Navigierte Aufrufe grenzen `fields` nicht ein

Ein navigierter Aufruf akzeptiert `fields`, antwortet aber mit dem vollständigen Zeilentyp. Das ist die einzige
Einschränkung dieser Form und der Grund, warum der flache Pfad öffentlich bleibt. Siehe
[Feldprojektion](./field-projection.md#navigierte-aufrufe-grenzen-nicht-ein).

## Es gibt keine dritte Form

`client.v2.workspace(slug).project(key)`, die gebundene Locator-Kette, die frühere Vorabversionen hatten, ist
**gelöscht**, nicht veraltet. Sie band nichts: Jede Ressource nimmt ihre IDs bei jedem Aufruf entgegen, sodass
`workspace(slug).roles.list(slug)` den Slug zweimal übergab. Jede Familie, die sie enthielt, ist bereits unter
`v2.workspaces`.
