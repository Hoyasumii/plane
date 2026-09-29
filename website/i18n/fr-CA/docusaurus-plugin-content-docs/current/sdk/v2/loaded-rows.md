---
sidebar_position: 2
title: Lignes chargées
description: "Les lignes navigables de l'API v2 : une ligne chargée porte ses ids, ses enfants s'atteignent donc sans les repasser."
---

# Lignes chargées

Une ressource qui a des enfants répond des **lignes navigables** depuis chaque méthode qui renvoie des
lignes : les données propres de la ligne, plus une propriété par enfant, avec les ids qui l'ont produite déjà
fournis. C'est la règle de consommation des ids : _un id est transmis une fois, au moment où il est connu_.
Une ressource sans enfant (`states`, `labels`, `roles`) répond le modèle simple, puisqu'il n'y a rien à
atteindre depuis elle.

```ts
const workspace = await client.v2.workspaces.retrieve("acme");

await workspace.projects.list(); // sans slug
await workspace.teamspaces.list(); // sans slug

// Et cela s'enchaîne : un projet chargé porte les deux ids.
const eng = await workspace.projects.retrieve("ENG");
await eng.states.list(); // sans slug, sans clé de projet
await eng.workItems.create({ name: "Fix login bug", state: "Todo", labels: ["bug"] });

// Trois niveaux plus bas : un élément de travail chargé porte les trois.
const item = await eng.workItems.retrieve("wi-1");
await item.comments.list();
```

L'enchaînement fonctionne parce qu'une ligne _sait quels ids l'ont chargée_. `list` et `iterate` rendent aussi
des lignes navigables, donc paginer ne perd pas la navigation :

```ts
for await (const project of client.v2.workspaces.projects.iterate("acme")) {
  await project.states.list(); // toujours navigable
}
```

## Ce que porte une ligne chargée

Une ligne navigable a le type `Loaded<Row, Navigation>`. Chaque propriété de navigation est une vue
`Owned<Child, Ids>` : les méthodes propres de la ressource enfant, avec les ids que la ligne détient déjà
retirés du début. Ainsi, `eng.states.list()` est `client.v2.workspaces.projects.states.list("acme", "ENG")`
avec les deux arguments de tête déjà fournis.

- **`row.$loaded`** porte `ids`, `idNames` et `present`, l'ensemble des noms de champ que le serveur a
  réellement renvoyés. Elle et les propriétés de navigation sont non énumérables, donc `{ ...row }`,
  `Object.keys(row)` et `JSON.stringify(row)` ne voient que la ligne API brute.
- **Une propriété de navigation ne masque jamais un champ.** Là où le nom naturel d'un enfant est déjà un champ
  de la ligne, la propriété est renommée et le champ est conservé : `estimate.estimatePoints` (parce que
  `?expand=points` renvoie un vrai champ `points`) et `property.propertyOptions` (de même pour `options`).
  Construire une ligne qui masquerait un champ lève une erreur plutôt que de cacher des données.
- **Seules les méthodes survivent à la navigation.** Une ressource petite-enfant n'est pas accessible depuis
  une vue : `project.workItems.comments` n'existe pas, car un commentaire a besoin de l'id propre d'un
  élément de travail, que seul un élément de travail chargé porte. Chargez d'abord l'élément de travail.

```ts
const project = await client.v2.workspaces.projects.retrieve("acme", "ENG");
console.log(project.$loaded.ids, project.$loaded.present.has("name"));
console.log(JSON.stringify(project)); // la ligne API brute, sans navigation
```

## Où la navigation s'arrête

`wiki` et `groupSync` sont des nœuds de regroupement, pas des ressources : ils ne consomment aucun id de
chemin propre, donc ils ne sont pas des propriétés de navigation sur une ligne d'espace de travail chargée.
Atteignez-les de façon plate, comme `client.v2.workspaces.wiki` et `client.v2.workspaces.groupSync`.

`releases.labels` est le seul endroit où une ligne chargée et le chemin plat diffèrent. La classe réunit à la
fois le catalogue de labels au niveau de l'espace de travail (`list`/`create`, slug seul) et le pont de
Memberships propre à chaque release. Une release chargée fixe le pont, donc `release.labels.add(...)`
fonctionne et `release.labels.list()` échoue à la vérification de types. Atteignez le catalogue de façon plate.

## Les appels navigués ne restreignent pas `fields`

Un appel navigué accepte `fields`, mais répond le type complet de la ligne. C'est la seule limitation de cette
forme, et la raison pour laquelle le chemin plat reste public. Voir
[Projection de champs](./field-projection.md#les-appels-navigués-ne-restreignent-pas).

## Il n'existe pas de troisième forme

`client.v2.workspace(slug).project(key)`, la chaîne de localisateurs liés que les aperçus précédents portaient,
est **supprimée**, pas dépréciée. Elle ne fixait rien : chaque ressource reçoit ses ids à chaque appel, donc
`workspace(slug).roles.list(slug)` passait le slug deux fois. Chaque famille qu'elle contenait est déjà sur
`v2.workspaces`.
