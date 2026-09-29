---
sidebar_position: 5
title: Outils génériques
description: "plane_resources, plane_describe et plane_call : trois outils MCP qui atteignent toutes les méthodes de l'API v2 sur les 90 ressources."
---

# Outils génériques

Trois outils couvrent chaque méthode v2 que possède le SDK, à travers les 90 ressources : cycles, modules,
pages, releases, initiatives, clients, webhooks, et le reste. Ils se trouvent dans `src/mcp/tools/generic.ts`.

1. **`plane_resources`** trouve une ressource. Sans `query`, il liste chaque chemin de ressource avec ses noms
   de méthode. Avec un `query` (`"cycle work items"`, `"webhook"`), il montre les ressources correspondantes
   avec leurs signatures de méthode.
2. **`plane_describe`** prend une `resource` et une `method` et montre la signature complète : les
   paramètres dans l'ordre d'appel (avec les champs du corps d'écriture), lesquels sont des ids de chemin, les
   valeurs autorisées de `fields`/`expand`/`order_by`/filtre, et un exemple d'entrée pour `plane_call`.
3. **`plane_call`** exécute la méthode, avec ses arguments par nom de paramètre.

Un échange typique, tel que l'agent le voit :

```json
{ "tool": "plane_resources", "arguments": { "query": "cycle" } }
{ "tool": "plane_describe", "arguments": { "resource": "workspaces.projects.cycles", "method": "list" } }
{
  "tool": "plane_call",
  "arguments": {
    "resource": "workspaces.projects.cycles",
    "method": "list",
    "args": { "slug": "acme", "project": "ENG", "params": { "per_page": 20 } }
  }
}
```

## `plane_call`

| Entrée     | Signification                                                                                                         |
| ---------- | --------------------------------------------------------------------------------------------------------------------- |
| `resource` | le chemin de ressource en pointillés, p. ex. `workspaces.projects.states`                                             |
| `method`   | le nom de la méthode, p. ex. `list`, `create`, `add`                                                                  |
| `args`     | les arguments par nom de paramètre : ids de chemin en premier (`slug`, `project`, …), puis les objets `data`/`params` |
| `limit`    | pour les méthodes `iterate` : combien d'éléments récolter (par défaut 100, au maximum 1000)                           |
| `confirm`  | doit être `true` pour exécuter une méthode destructive                                                                |

`slug` vaut par défaut l'espace de travail configuré. Les `params` de liste acceptent `fields`, des filtres,
`order_by`, `per_page` et `offset`. Un résultat de plus de 60 000 caractères est coupé, avec une note qui le
précise.

**Les méthodes destructives** (`delete`, `bulkDelete`, `remove`, `unlink`) refusent de s'exécuter sans
`confirm: true`. La description de l'outil dit à l'agent de d'abord demander à l'utilisateur.

## Le catalogue

Les outils génériques lisent `src/mcp/generated/catalog.json` : chemins de ressource, noms de paramètres
dans l'ordre d'appel, et les valeurs autorisées d'après le document OpenAPI api_v2. Il est généré depuis la
source du SDK par `pnpm codegen:mcp`, et jamais modifié à la main.

`plane_call` n'atteint que les méthodes du catalogue, et ordonne les arguments nommés selon les noms de
paramètres qu'il déclare. Sur une instance sans API v2, `plane_resources` et `plane_call` refusent avec un
message qui renvoie vers les outils typés; `plane_describe` continue de fonctionner, car il ne lit que le
catalogue.
