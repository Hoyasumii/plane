---
sidebar_position: 6
title: Configuration
description: "Les quatre paramètres que partagent le serveur MCP, le binaire plane-mcp et la CLI plane, où ils sont enregistrés et lequel l'emporte."
---

# Configuration

Le serveur, le binaire `plane-mcp` et la CLI `plane` lisent les quatre mêmes paramètres :

| Paramètre         | Option        | Valeur par défaut      | Signification                                                                        |
| ----------------- | ------------- | ---------------------- | ------------------------------------------------------------------------------------ |
| `PLANE_API_KEY`   | `--api-key`   | aucune (obligatoire)   | la clé d'API Plane, envoyée comme `X-Api-Key`                                        |
| `PLANE_BASE_URL`  | `--base-url`  | `https://api.plane.so` | l'instance Plane : Plane Cloud, ou l'URL de votre auto-hébergement                   |
| `PLANE_WORKSPACE` | `--workspace` | aucune                 | un espace de travail par défaut : avec lui, le `slug` de chaque outil est facultatif |
| `PORT`            | `--port`      | `3766`                 | le port du serveur HTTP sur `127.0.0.1`                                              |

Chacun est pris dans le premier de : une option, l'environnement, le fichier enregistré, la valeur par défaut.
La résolution se trouve dans `resolveMcpConfig` (`src/mcp/config.ts`).

## Le fichier enregistré

`plane mcp config` enregistre les paramètres dans un `.env` par utilisateur :

| Système d'exploitation | Chemin                                                   |
| ---------------------- | -------------------------------------------------------- |
| Linux                  | `~/.config/plane/.env` (en respectant `XDG_CONFIG_HOME`) |
| macOS                  | `~/Library/Application Support/plane/.env`               |
| Windows                | `%APPDATA%\plane\.env`                                   |

`PLANE_CONFIG` (ou `--config`) pointe vers un autre fichier à la place. Le fichier pid et le journal du serveur
en arrière-plan se trouvent dans un dossier `run/` à côté de lui.

```text
PLANE_API_KEY=plane_api_0123456789abcdef
PLANE_BASE_URL=https://plane.example.com
PLANE_WORKSPACE=acme
PORT=3766
```

Chaque commande `plane`, sauf `plane mcp config` et `plane mcp uninstall`, refuse de s'exécuter jusqu'à ce que
ce fichier contienne une clé d'API. Les options et les variables d'environnement remplacent alors les valeurs
enregistrées pour cette exécution uniquement. `plane-mcp` et le `plane <outil>` intra-processus lisent aussi le
fichier enregistré.

Voir [`plane mcp config`](../cli/mcp-commands.md#plane-mcp-config) pour les trois façons de l'écrire.

## Depuis le code

La même résolution est exportée, pour les outils qui veulent réutiliser la configuration enregistrée :

```ts
import { configFilePath, readEnvFile, resolveMcpConfig, startPlaneMcpServer } from "@hoyasumii/plane/mcp";

const config = resolveMcpConfig({ env: process.env, file: readEnvFile(configFilePath()) });
if (!config.apiKey) throw new Error("run `plane mcp config` first");

const server = await startPlaneMcpServer(config);
console.log(server.url);
```
