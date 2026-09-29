---
sidebar_position: 1
title: Aperçu du serveur MCP
description: "Le serveur MCP de Plane : Plane pour Claude Code, Codex, OpenCode, Claude Desktop et tout autre client MCP."
---

# Serveur MCP

`@hoyasumii/plane/mcp` transforme le SDK en un serveur [MCP](https://modelcontextprotocol.io), pour que Claude
Code, Codex, OpenCode, Claude Desktop ou tout autre client MCP puisse travailler avec Plane.

## Deux transports

| Transport              | Qui exécute le serveur                                   | Comment le démarrer                                       |
| ---------------------- | -------------------------------------------------------- | --------------------------------------------------------- |
| **stdio** (par défaut) | le client MCP lance `plane-mcp` et possède le processus  | `plane mcp install`, ou enregistrez `plane-mcp` à la main |
| **Streamable HTTP**    | un serveur de longue durée partagé par plusieurs clients | `plane mcp start`, `plane-mcp --http`, ou depuis le code  |

En mode stdio, le serveur démarre avec le client et se termine quand le client ferme stdin. stdout porte le
protocole, donc le serveur n'écrit ses journaux que sur stderr. En mode HTTP, il n'écoute que sur `127.0.0.1`,
sans état, via Streamable HTTP (`POST /mcp`), et son cache est partagé par chaque client qui se connecte.

## Trois types d'outils

- **[Outils de tâche](./task-tools.md)** (`plane_get_issue`, `plane_update_issue`, `plane_add_comment`, …)
  sont le contrat stable sur lequel s'appuient les flux d'agents pilotés par tâche. Ils prennent les tâches par
  clé (`ACME-130`) et les projets, états, labels et membres par nom, et répondent une sortie lisible, sans ids.
  Ils utilisent toujours l'API v1, que Plane Cloud comme l'auto-hébergé servent.
- **[Outils d'élément de travail](./work-item-tools.md)** (`plane_list_work_items`, `plane_get_work_item`,
  `plane_create_work_item`, `plane_update_work_item`) utilisent l'API v2, avec ses filtres, `fields` et
  `expand`.
- **[Outils génériques](./generic-tools.md)** (`plane_resources`, `plane_describe`, `plane_call`) couvrent
  toutes les autres méthodes v2, à travers les 90 ressources.

## Instances sans API v2

Le Plane auto-hébergé 1.4.x répond 404 à chaque route `/api/v2`. Le serveur le découvre avec un unique
`GET /api/v2/users/me/` la première fois qu'il en a besoin, et retient la réponse pour toute la durée de vie du
processus. Une clé invalide ou une erreur réseau ne sont pas retenues. Sur une telle instance :

- Les outils de tâche fonctionnent normalement, puisqu'ils utilisent la v1 de toute façon.
- Les outils `*_work_item` répondent via la v1, avec les mêmes entrées. Les paramètres que seule la v2 peut
  servir (`cycle_id`, `module_id`, `order_by`, `fields`, `expand`, `type`, `estimate`) échouent nommément.
- `plane_resources` et `plane_call` signalent que la v2 n'est pas disponible et renvoient vers les outils
  typés, au lieu de relayer un 404. `plane_describe` continue de fonctionner, car il ne lit que le catalogue.

`plane_whoami` indique quelle API l'instance sert (`v1` ou `v2`).

## Étapes suivantes

- [Installation](./setup.md) : enregistrez le serveur dans votre client MCP.
- [Configuration](./configuration.md) : les paramètres et où ils sont enregistrés.
- [Utilisation programmatique](./programmatic.md) : démarrez le serveur depuis votre propre code.
