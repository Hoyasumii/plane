---
sidebar_position: 4
title: Outils d'élément de travail
description: "Quatre outils MCP typés pour les éléments de travail sur l'API v2, avec ses filtres, fields et expand."
---

# Outils d'élément de travail

Quatre outils typés couvrent les éléments de travail via l'API v2, avec ses filtres, `fields` et `expand`. Ils
se trouvent dans `src/mcp/tools/curated.ts`. Tout le reste passe par les [outils génériques](./generic-tools.md).

| Outil                    | Ce qu'il fait                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `plane_list_work_items`  | les éléments de travail d'un projet, ou de tout l'espace de travail si `project` est omis |
| `plane_get_work_item`    | un élément de travail, par identifiant (`ENG-123`) ou par UUID plus `project`             |
| `plane_create_work_item` | crée un élément de travail dans un projet                                                 |
| `plane_update_work_item` | change les champs fournis, et n'envoie que ceux-ci                                        |

`slug` est obligatoire sauf si un espace de travail par défaut est configuré. `project` est un UUID de projet
ou son identifiant (`ENG`), et `workItem` un identifiant comme `ENG-123` ou un UUID. Avec un identifiant, aucun
projet n'est nécessaire : il est résolu via la recherche à l'échelle de l'espace de travail.

## `plane_list_work_items`

| Entrée         | Signification                                                           |
| -------------- | ----------------------------------------------------------------------- |
| `project?`     | un projet; si omis, tout l'espace de travail                            |
| `search?`      | recherche en texte libre                                                |
| `state_id?`    | un état                                                                 |
| `state_group?` | `backlog`, `unstarted`, `started`, `completed`, `cancelled` ou `triage` |
| `assignee_id?` | un assigné                                                              |
| `label_id?`    | un label                                                                |
| `priority?`    | `none`, `low`, `medium`, `high` ou `urgent`                             |
| `cycle_id?`    | un cycle                                                                |
| `module_id?`   | un module                                                               |
| `order_by?`    | un ordre de tri, p. ex. `-updated_at`                                   |
| `fields?`      | seulement ces champs, p. ex. `["name", "state_id"]`                     |
| `per_page?`    | taille de page, 1–100                                                   |
| `offset?`      | lignes à ignorer, pour la page suivante                                 |

Pour les filtres que ces entrées ne couvrent pas, exécutez `plane_describe` sur `workspaces.projects.workItems`
`list`.

## `plane_get_work_item`

`workItem`, plus `project` (uniquement quand `workItem` est un UUID) et `expand` (objets liés à inclure, p. ex.
`["state", "labels"]`).

## `plane_create_work_item` et `plane_update_work_item`

Les deux prennent `project` (création) ou `workItem` (mise à jour), puis les champs de l'élément de travail.
`name` est obligatoire à la création.

| Champ                        | Signification                                                       |
| ---------------------------- | ------------------------------------------------------------------- |
| `name`                       | le titre                                                            |
| `description_html`           | la description en HTML, p. ex. `<p>text</p>`                        |
| `state` / `state_id`         | un nom d'état (`In Progress`) ou son id                             |
| `priority`                   | `none`, `low`, `medium`, `high` ou `urgent`                         |
| `assignees` / `assignee_ids` | des courriels d'assignés, ou leurs ids                              |
| `labels` / `label_ids`       | des noms de labels, ou leurs ids                                    |
| `parent`                     | l'identifiant ou l'id de l'élément de travail parent                |
| `type`                       | un nom de type d'élément de travail                                 |
| `start_date` / `target_date` | `YYYY-MM-DD`; la date cible ne peut pas être avant la date de début |
| `estimate`                   | une valeur d'estimation                                             |
| `cycle_id`                   | un id de cycle, ou `null`                                           |

## Sur une instance sans API v2

Sur le Plane auto-hébergé 1.4.x, ces quatre outils répondent via la v1 (`src/mcp/tools/work-items-v1.ts`) avec
les mêmes entrées. Les paramètres que seule la v2 peut servir (`cycle_id`, `module_id`, `order_by`, `fields`,
`expand`, `type`, `estimate`) échouent nommément au lieu d'être ignorés.
