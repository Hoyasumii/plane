---
sidebar_position: 1
title: Aperçu de l'API v2
description: "La surface de l'API v2 sur client.v2 : 90 ressources, les ids de chemin en premiers paramètres positionnels et les noms de méthode standard."
---

# Aperçu de l'API v2

`client.v2` donne accès à la surface v2 : 90 classes de ressources, générées à partir du document OpenAPI
api_v2 de Plane. Les ressources v1 du client restent inchangées (voir [API v1](../v1.md)).

Il y a **deux façons d'y accéder**, et ce sont les mêmes ressources dans les deux cas :

1. **Le chemin plat.** Chaque ressource est un attribut, et chaque id est un argument.
2. **Les lignes chargées.** Une ligne chargée est là où vivent ses enfants. Voir [Lignes chargées](./loaded-rows.md).

## Le chemin plat

Une ressource pend du namespace à la position que son URL indique, et prend les ids que son URL nomme comme
**arguments positionnels de tête**, dans l'ordre du chemin :

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

`v2.workspaces` et `v2.workspaces.projects` sont les deux racines. Chaque ressource se trouve à exactement un
chemin d'attributs, celui que son URL nomme : une ressource au niveau de l'espace de travail sous
`v2.workspaces`, une au niveau du projet sous `v2.workspaces.projects`.

`project` accepte l'UUID d'un projet **ou** son identifiant lisible (`"ENG"`). Un élément de travail peut être
atteint par sa clé humaine avec `retrieveByIdentifier`. Aucune méthode v2 ne prend un objet d'option
`workspaceSlug` ou `project` : les ids de chemin sont positionnels et toujours en premier, dans l'ordre de
l'URL, et tout le reste vit dans l'objet `params` final.

```ts
// ENG-123, sans connaître d'abord son projet.
const item = await client.v2.workspaces.workItems.retrieveByIdentifier("acme", "ENG-123");
console.log(item.name);
```

## Les méthodes standard

La plupart des ressources exposent certains des mêmes verbes, chacun avec ses ids de chemin en premier :

| Méthode                                    | Ce qu'elle fait                                                              |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| `list(...ids, params?)`                    | une page de lignes ([Pagination](./pagination.md))                           |
| `iterate(...ids, params?)`                 | un itérateur asynchrone qui suit les pages pour vous                         |
| `retrieve(...ids, id, params?)`            | une ligne                                                                    |
| `create(...ids, data, params?)`            | une nouvelle ligne                                                           |
| `update(...ids, id, data, params?)`        | une mise à jour partielle                                                    |
| `upsert(...ids, data, params?)`            | crée, ou met à jour la ligne portant le même `external_source`/`external_id` |
| `delete(...ids, id)`                       | retire la ligne                                                              |
| `archive` / `unarchive`                    | sur les projets et les éléments de travail                                   |
| `bulkCreate` / `bulkUpdate` / `bulkDelete` | des lots ([Memberships et écritures en bloc](./memberships-and-bulk.md))     |
| `findByName` et les autres `findBy*`       | exactement une ligne par une clé humaine ([Recherches](./lookups.md))        |

Les lectures et écritures qui acceptent `fields` restreignent leur type de retour aux champs demandés
([Projection de champs](./field-projection.md)). `expand` inclut les objets liés, et `order_by` est validé
contre les ordres de tri propres à l'opération.

## Données générées

`v2.FIELDS`, `v2.EXPAND` et `v2.ORDER_BY` sont les tables complètes operation id → valeurs autorisées contre
lesquelles les encodeurs valident (par exemple, `v2.FIELDS["states_list"]` liste chaque champ que
`states.list` accepte). `v2.OPENAPI_VERSION` est la version du document api_v2 à partir de laquelle le SDK a
été généré. Tous, plus les deux plafonds `v2.BULK_MAX_ITEMS` et `v2.BRIDGE_MAX_IDS`, sont exportés pour que
vous puissiez énumérer les valeurs valides au lieu de les deviner.

```ts
import { v2 } from "@hoyasumii/plane";

console.log(v2.OPENAPI_VERSION, v2.FIELDS["states_list"]);
```
