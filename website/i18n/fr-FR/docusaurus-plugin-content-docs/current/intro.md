---
sidebar_position: 1
title: Prise en main
description: "Un SDK TypeScript pour l'API de Plane, avec un serveur MCP et une CLI construits par-dessus : le rôle de chaque partie et son installation."
slug: /intro
---

# Prise en main

`@hoyasumii/plane` est un SDK TypeScript pour l'API [Plane](https://plane.so), avec un serveur MCP et une CLI
construits par-dessus. Utilisez-le depuis votre code, depuis un agent d'IA ou depuis votre terminal : les trois
partagent le même client.

- **SDK** : un client typé pour l'API v1 et toute la surface v2 (`client.v2`, 90 ressources). `fields` restreint
  le type de retour à la compilation, et les lignes chargées peuvent être parcourues jusqu'à leurs enfants.
  Commencez par [API v2](./sdk/v2/overview.md).
- **Serveur MCP** (`@hoyasumii/plane/mcp`) : stdio ou Streamable HTTP. Il propose des outils de tâche qui
  fonctionnent avec des clés et des noms (`ACME-130`, `"Todo"`, `"me"`) et des outils génériques qui couvrent
  chaque méthode v2.
  Commencez par [Serveur MCP](./mcp/overview.md).
- **CLI** (`plane`) : chaque outil MCP sous forme de sous-commande, plus `plane mcp` pour configurer le
  serveur, l'exécuter en arrière-plan, le démarrer à la connexion et l'enregistrer dans Claude Code, Codex et
  OpenCode.
  Commencez par [CLI](./cli/overview.md).

Il fonctionne avec Plane Cloud et avec des instances auto-hébergées, y compris la version auto-hébergée 1.4.x,
qui n'a pas d'API v2.

## Installation

Nécessite Node.js 20 ou une version ultérieure.

```bash
npm install @hoyasumii/plane
# ou
pnpm add @hoyasumii/plane
```

## Démarrage rapide

Créez un client avec une clé d'API (Plane → paramètres de l'espace de travail → jetons d'API), ou avec un jeton
d'accès OAuth. `baseUrl` vaut par défaut Plane Cloud (`https://api.plane.so`) ; pointez-le vers votre propre
instance en cas d'auto-hébergement.

```ts
import { PlaneClient } from "@hoyasumii/plane";

const client = new PlaneClient({ apiKey: "your-api-key" });

// API v2 : les ids de chemin sont positionnels et arrivent en premier, dans l'ordre de l'URL.
const states = await client.v2.workspaces.projects.states.list("acme", "ENG");

// Une ligne chargée porte ses ids, donc ses enfants n'en ont besoin d'aucun.
const eng = await client.v2.workspaces.projects.retrieve("acme", "ENG");
await eng.workItems.create({ name: "Fix login bug", state: "Todo", labels: ["bug"] });

// L'API v1 est aussi disponible sur le client.
const projects = await client.projects.list("acme");
```

## Utilisation depuis un agent d'IA

Enregistrez vos paramètres une fois, puis enregistrez le serveur MCP dans les clients installés sur votre
machine :

```bash
npx plane mcp config    # demande la clé d'API, l'URL de l'instance et un espace de travail par défaut
npx plane mcp install   # enregistre plane-mcp dans Claude Code, Codex et OpenCode
```

[Installation du serveur MCP](./mcp/setup.md) couvre la configuration manuelle et le transport HTTP.

## Utilisation depuis le terminal

Après `plane mcp config`, chaque outil MCP devient une commande :

```bash
npx plane whoami
npx plane list-my-issues
npx plane get-issue --key ACME-14
```

Voir [CLI](./cli/overview.md).
