---
sidebar_position: 1
title: Aperçu de la CLI
description: "La commande plane : chaque outil MCP devient une sous-commande, et son schéma d'entrée devient ses options."
---

# CLI

Le paquet installe une commande `plane`. C'est un client MCP du [même serveur](../mcp/overview.md) : chaque
outil MCP devient une sous-commande, et le schéma d'entrée de l'outil devient ses options. Par défaut, le
serveur tourne à l'intérieur de la commande, donc il n'y a rien à démarrer au préalable.

```bash
npx plane mcp config                 # une fois : enregistre la clé d'API (PLANE_BASE_URL vaut https://api.plane.so par défaut)
npx plane tools                      # toutes les commandes, une par outil MCP
npx plane whoami
npx plane get-issue --key ACME-14
npx plane list-my-issues --project ACME
npx plane list-work-items --slug acme --project ENG --per-page 20 --fields name,state_id
npx plane get-work-item --slug acme --work-item ENG-123
npx plane resources --query cycle
npx plane describe --resource workspaces.projects.cycles --method delete
npx plane call --resource workspaces.projects.cycles --method delete \
  --args '{"slug":"acme","project":"ENG","cycle":"<cycle-id>"}' --confirm
```

Rien à part `--help`, `--version` et `plane docs` ne s'exécute avant que `plane mcp config` ait enregistré une
configuration avec une clé d'API. `plane docs` affiche le lien vers ce site et l'ouvre dans le navigateur.

## Des outils aux commandes

- La commande est le nom de l'outil sans `plane_`, en kebab-case : `plane_list_work_items` → `list-work-items`.
- Chaque option correspond à une entrée en kebab-case : `per_page` → `--per-page`, `workItem` → `--work-item`.
- Les options de type tableau acceptent `a,b` ou du JSON, les options de type objet acceptent du JSON, et les
  options booléennes n'ont besoin d'aucune valeur.
- `plane <commande> --help` liste les options d'une commande, avec les valeurs autorisées des entrées de type
  énumération.

La sortie d'un outil va sur stdout. Une erreur d'outil va sur stderr avec le code de sortie 1.

## Parler à un serveur déjà lancé

Pour utiliser un `plane-mcp` déjà lancé en HTTP plutôt que celui qui tourne dans le même processus, passez
`--url http://127.0.0.1:3766/mcp` ou définissez `PLANE_MCP_URL`. `--base-url` et `--api-key` remplacent
l'environnement et le fichier enregistré pour le serveur intra-processus.

Aucune de ces options ne remplace la configuration enregistrée : la CLI refuse d'exécuter des outils sans
elle, même quand `--url` ou `--api-key` est fourni.

## Gérer le serveur

`plane mcp` est intercepté avant toute connexion. Il configure le serveur, l'exécute en arrière-plan, le
démarre à la connexion et l'enregistre dans vos clients MCP. Voir [`plane mcp`](./mcp-commands.md).
