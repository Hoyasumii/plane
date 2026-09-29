---
sidebar_position: 2
title: Installation
description: "Enregistrez vos paramètres une fois, puis inscrivez le serveur MCP de Plane dans Claude Code, Codex et OpenCode."
---

# Installation

## La méthode rapide

Enregistrez vos paramètres une fois, puis laissez la CLI enregistrer le serveur dans les clients qu'elle
trouve :

```bash
npx plane mcp config    # demande la clé d'API, l'URL de l'instance, un espace de travail par défaut et un port
npx plane mcp install   # trouve Claude Code, Codex et OpenCode dans votre PATH et y enregistre plane-mcp (stdio)
```

`install` affiche une liste à cocher des clients trouvés. Cochez ceux que vous voulez, et il enregistre le
serveur via la CLI propre de chaque client, sous le nom `plane`. La commande enregistrée lit la configuration
enregistrée quand le client la lance, donc aucune clé d'API ne se retrouve dans la configuration du client.
Voir [`plane mcp install`](../cli/mcp-commands.md#plane-mcp-install) pour les options.

## À la main : stdio

Laissez le client démarrer `plane-mcp`. Il lit la configuration enregistrée, donc la configuration du client
n'a besoin d'aucune clé :

```json
{
  "mcpServers": {
    "plane": { "command": "npx", "args": ["-y", "-p", "@hoyasumii/plane", "plane-mcp"] }
  }
}
```

Dans Claude Code :

```bash
claude mcp add plane -- npx -y -p @hoyasumii/plane plane-mcp
```

Sans configuration enregistrée, ou pour la remplacer, donnez au client un bloc `env` avec `PLANE_API_KEY`,
`PLANE_BASE_URL` et `PLANE_WORKSPACE` :

```json
{
  "mcpServers": {
    "plane": {
      "command": "npx",
      "args": ["-y", "-p", "@hoyasumii/plane", "plane-mcp"],
      "env": { "PLANE_API_KEY": "your-api-key", "PLANE_WORKSPACE": "acme" }
    }
  }
}
```

## À la main : HTTP

Exécutez un serveur en arrière-plan et pointez vos clients vers son URL :

```bash
npx plane mcp start          # affiche l'URL, http://127.0.0.1:3766/mcp par défaut
claude mcp add --transport http plane http://127.0.0.1:3766/mcp
```

Sans la CLI : `PORT=3766 PLANE_BASE_URL=... PLANE_API_KEY=... npx plane-mcp --http` l'exécute au premier
plan. `plane-mcp --help` liste les options. Pour démarrer le serveur à chaque connexion, exécutez
`npx plane mcp boot enable` (voir [`plane mcp boot`](../cli/mcp-commands.md#plane-mcp-boot)).

## Vérifier que ça fonctionne

Demandez à votre agent d'appeler `plane_whoami`, ou exécutez-le depuis le terminal :

```bash
npx plane whoami
```

Il répond l'utilisateur de la clé, l'espace de travail par défaut, l'URL de base et l'API que l'instance sert.
