---
sidebar_position: 4
title: Memberships et écritures en bloc
description: "Les ponts d'appartenance (add et remove, jusqu'à 100 ids) et les écritures en lot (jusqu'à 50 éléments) de l'API v2, et pourquoi les plafonds diffèrent."
---

# Memberships et écritures en bloc

**Il y a deux plafonds de lot, et ce sont des nombres différents.**

| Lot                    | Plafond                           | Méthodes                                                |
| ---------------------- | --------------------------------- | ------------------------------------------------------- |
| Un pont de Memberships | `v2.BRIDGE_MAX_IDS` (100) ids     | `add` / `remove` (et `link` sur les propriétés de type) |
| Une écriture en bloc   | `v2.BULK_MAX_ITEMS` (50) éléments | `bulkCreate` / `bulkUpdate` / `bulkDelete`              |

Le premier est le `maxItems` du golden sur les 24 schémas `add`/`remove`, le second son `maxItems` sur les 21
schémas de create/update/delete en bloc. Dimensionner un appel de pont à 50 fonctionne, mais gaspille la moitié
de chaque aller-retour; dimensionner un appel en bloc à 100 lève une erreur côté client.

## Memberships

Les Memberships sont des `add`/`remove` sur une sous-ressource nommée pour la chose ajoutée : d'abord les
ids de chemin, puis 1 à 100 ids (`BRIDGE_MAX_IDS`). Une liste vide ou trop grande lève une erreur avant toute
requête. Chaque appel n'envoie que son propre verbe et se résout vers les ids que le serveur a réellement
changés.

```ts
const v2ns = client.v2;

await v2ns.workspaces.projects.cycles.workItems.add("acme", "ENG", cycleId, [itemId]); // -> ["<item id>"]
await v2ns.workspaces.projects.modules.workItems.remove("acme", "ENG", moduleId, [itemId]);
await v2ns.workspaces.releases.labels.add("acme", releaseId, [labelId]);
await v2ns.workspaces.initiatives.projects.add("acme", initiativeId, [projectId]);
await v2ns.workspaces.wiki.collections.members.add("acme", collectionId, [{ member_id: userId, access: 1 }]);
```

Les propriétés d'un type d'élément de travail utilisent `link`/`unlink` à la place, comme dans l'application
web. `unlink` supprime les valeurs de cette propriété sur chaque élément de travail du type.

```ts
await client.v2.workspaces.projects.workItemTypes.properties.link("acme", "ENG", typeId, [propertyId]);
await client.v2.workspaces.projects.workItemTypes.properties.unlink("acme", "ENG", typeId, propertyId);
```

## Écritures en bloc

`bulkCreate` / `bulkUpdate` / `bulkDelete` répondent toujours HTTP 200, même quand certaines lignes échouent :
le succès partiel est la valeur par défaut. La réponse compte `succeeded` et `failed` et a une entrée par
ligne dans `results`. Appelez `v2.raiseForFailures(result)` pour lever un `PlaneApiError` portant les `errors`
du premier échec, ou lisez les lignes échouées avec `v2.bulkFailures(result)`.

Le plafond est de 50 éléments par appel (`BULK_MAX_ITEMS`), pas les 100 qu'accepte un pont de Memberships. Un
lot vide est refusé côté client plutôt que de devenir une opération silencieuse qui ne fait rien.

```ts
import { v2 } from "@hoyasumii/plane";

const result = await client.v2.workspaces.projects.states.bulkCreate("acme", "ENG", [{ name: "QA", color: "#ffffff" }]);
v2.raiseForFailures(result);

// Chaque élément de bulkUpdate est le patch plus l'id cible.
await client.v2.workspaces.projects.states.bulkUpdate("acme", "ENG", [{ id: "state-1", color: "#000000" }]);
```

Chaque méthode en bloc prend un dernier argument `allOrNone` (par défaut `false`). Passez `true` pour demander
au serveur d'appliquer toutes les lignes ou aucune.

Pour écrire plus de 50 lignes, divisez-les vous-même :

```ts
import { v2, v2models } from "@hoyasumii/plane";

const rows: v2models.CreateState[] = [{ name: "QA", color: "#ffffff" }];

for (let start = 0; start < rows.length; start += v2.BULK_MAX_ITEMS) {
  const chunk = rows.slice(start, start + v2.BULK_MAX_ITEMS);
  v2.raiseForFailures(await client.v2.workspaces.projects.states.bulkCreate("acme", "ENG", chunk));
}
```
