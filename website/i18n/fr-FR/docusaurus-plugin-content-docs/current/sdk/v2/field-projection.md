---
sidebar_position: 3
title: Projection de champs
description: "Comment fields restreint le type de retour à la compilation, en lecture comme en écriture, et le seul endroit où la restriction ne survit pas."
---

# Projection de champs

`fields` restreint le **type de retour**, pas seulement la réponse. Demandez deux champs, et la ligne que vous
obtenez a ces deux champs plus `id`. Lire quoi que ce soit d'autre est une erreur de compilation, pas un
`undefined` à l'exécution :

```ts
const page = await client.v2.workspaces.projects.states.list("acme", "ENG", { fields: ["id", "name"] });
for (const state of page.data) {
  console.log(state.id, state.name); // typé : seuls id/name existent sur cette ligne
  // console.log(state.color);       // erreur de compilation : `color` n'a pas été demandé
}
```

Un littéral de tableau en ligne n'a besoin d'aucun `as const`. Cela vaut aussi pour `iterate` et `retrieve`,
et, puisque c'est la même affirmation, pour les **écritures** : `create`, `update` et `upsert` acceptent
`fields` et restreignent leur réponse de la même façon.

```ts
const created = await client.v2.workspaces.projects.states.create(
  "acme",
  "ENG",
  { name: "In Review", color: "#4ECDC4" },
  { fields: ["id", "name"] }
);
console.log(created.name); // restreint ; `created.color` ne compilerait pas
```

## Listes de champs construites à l'exécution

Une liste de champs construite à l'exécution (pas un littéral) doit tout de même être typée comme des noms de
champ. Un simple `string[]` n'est **pas** assignable à `readonly StateField[]` et échoue avec une longue erreur
d'incompatibilité de surcharge. La ligne est restreinte au **type d'élément** de la liste, donc typez la
variable aussi précisément que ce que vous utilisez réellement :

```ts
import { PlaneClient, v2 } from "@hoyasumii/plane";

const client = new PlaneClient({ baseUrl: "https://api.plane.so", apiKey: "..." });

// Restreint à ces deux noms, même si la valeur est choisie à l'exécution.
const wanted: ("id" | "name")[] = includeColor ? ["id", "name"] : ["id"];
const page = await client.v2.workspaces.projects.states.list("acme", "ENG", { fields: wanted });

// Typé comme l'union entière à la place, ceci restreint à « tous les champs », c.-à-d. la ligne complète.
const anything: v2.StateField[] = includeColor ? ["id", "name", "color"] : ["id", "name"];
const unnarrowed = await client.v2.workspaces.projects.states.list("acme", "ENG", { fields: anything });
```

`"all"` est une valeur de champ légale signifiant « tous les champs », et elle rend bien le type de ligne
complet.

Les réponses partielles signifient que chaque champ de lecture, sauf `id`, est facultatif dans les modèles.
Vérifiez `undefined` plutôt que de présumer sa présence. Quand la liste a été construite dynamiquement,
`row.$loaded.present` vous dit ce qui est réellement revenu.

## Les appels navigués ne restreignent pas

**Cette limitation est la raison pour laquelle la forme plate reste publique.** Un appel navigué se résout
contre la signature générale, donc il accepte `fields` mais ne restreint **pas** :

```ts
const eng = await client.v2.workspaces.projects.retrieve("acme", "ENG");
const listed = await eng.states.list({ fields: ["id", "name"] }); // Page<State>, non restreint
```

TypeScript efface un paramètre de type quand il l'infère à travers le type conditionnel derrière une propriété
de navigation, donc la surcharge de restriction ne peut pas être reportée. Faire correspondre l'ensemble de
surcharges à la place serait pire, pas mieux : l'inférence effacerait `F` à sa contrainte et prétendrait que
_tous_ les champs sont présents. Quand vous voulez la ligne restreinte, appelez la ressource de façon plate :
`client.v2.workspaces.projects.states.list("acme", "ENG", { fields: [...] })`.

## `expand` et `order_by`

`expand` inclut des objets liés (`{ expand: ["state", "labels"] }` sur un élément de travail), validé contre
les valeurs autorisées de l'opération dans `v2.EXPAND`.

`order_by` est validé de la même façon que `fields`, contre une union générée (`StateOrderBy`, `LabelOrderBy`,
…). Un littéral hors de cette union est une erreur de compilation, et une valeur construite à l'exécution est
rejetée côté client par `encodeOrderBy` plutôt que d'atteindre le serveur comme un 400.

```ts
await client.v2.workspaces.projects.states.list("acme", "ENG", { order_by: "-created_at" });
```
