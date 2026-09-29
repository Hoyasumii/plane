---
sidebar_position: 2
title: plane mcp
description: "plane mcp : enregistrer la configuration, lancer le serveur en arrière-plan, le démarrer à la connexion et l'inscrire dans vos clients MCP."
---

# `plane mcp`

`plane mcp` gère le serveur MCP pour vous : sa configuration enregistrée, un serveur HTTP en arrière-plan, un
service de connexion, et son enregistrement dans vos clients MCP.

```bash
npx plane mcp config                 # demande les paramètres dans le terminal et les enregistre
npx plane mcp config --workspace acme --port 4000   # sans invites (scripts, CI) : enregistre juste ceux-ci, garde le reste
npx plane mcp config --web           # la même chose, dans un formulaire web local
npx plane mcp install                # choisir Claude Code / Codex / OpenCode et y enregistrer plane-mcp (stdio)
npx plane mcp install --client claude,opencode --force   # sans sélecteur (scripts, CI) ; --force remplace une entrée
npx plane mcp uninstall              # choisir les clients dont retirer l'entrée « plane » (aucune configuration requise)
npx plane mcp start                  # démarre en arrière-plan (nécessite une configuration enregistrée) ; affiche l'URL pour `claude mcp add`
npx plane mcp start --api-key other --port 4000   # valeurs ponctuelles, jamais enregistrées
npx plane mcp status                 # en cours ou arrêté (code 3), URL, pid, durée de fonctionnement
npx plane mcp stop
npx plane mcp boot enable            # démarrer à chaque connexion ; `boot disable` / `boot status`
```

## `plane mcp config`

Écrit le `.env` enregistré ([Configuration](../mcp/configuration.md)). Cela fonctionne de trois façons :

- **Dans le terminal** (par défaut). Il demande chaque paramètre à son tour, en partant des valeurs
  enregistrées. La clé est saisie masquée, et Entrée conserve la valeur enregistrée. Pour les autres
  paramètres, effacez la ligne (Ctrl+U) pour revenir à la valeur par défaut.
- **Avec des options.** Avec l'une de `--api-key`, `--base-url`, `--workspace` ou `--port`, il ne demande rien
  et n'enregistre que celles-ci (`--workspace=` en efface une). Sans terminal, elles sont obligatoires. Une clé
  passée en option reste dans l'historique de votre shell, donc préférez l'invite pour elle.
- **Dans un formulaire web** avec `--web` : une page locale, ouverte dans le navigateur (`--no-open` pour
  seulement afficher son URL).

Si un serveur est en cours d'exécution, il est invité à redémarrer pour prendre en compte les changements.
`--config <fichier>` (ou `PLANE_CONFIG`) écrit dans un autre fichier.

## `plane mcp install`

Détecte chaque client en exécutant son `--version`, et enregistre le serveur stdio via la CLI propre du
client, sous le nom `plane` :

| Client      | Commande exécutée           |
| ----------- | --------------------------- |
| Claude Code | `claude mcp add -s user`    |
| Codex       | `codex mcp add`             |
| OpenCode    | `opencode mcp add --global` |

La commande enregistrée est `node <paquet>/dist/mcp/cli.js` par chemin absolu, sans clé d'API : le serveur
lit le fichier enregistré quand le client le lance (`PLANE_CONFIG` n'est passé que lorsque `--config` nomme un
autre fichier).

Chaque client trouvé démarre cochée. Un client qui a déjà une entrée `plane` est marqué
`already installed, reinstalls` et se voit remplacé. Sans terminal interactif, `--client` est obligatoire
(`claude`, `codex`, `opencode` ; à l'intérieur de WSL, aussi `claude@windows`, `codex@windows`,
`opencode@windows`), plus `--force` pour remplacer une entrée. `--dry-run` affiche les commandes au lieu de
les exécuter.

`install` et `uninstall` agissent tous deux sur la configuration utilisateur (globale) de chaque client. Les
entrées limitées à un projet ne sont jamais touchées.

## `plane mcp uninstall`

Liste les clients ayant une entrée `plane`, en indiquant si elle est `stdio` ou `http`, et retire toute entrée
de ce nom : `claude mcp remove -s user`, `codex mcp remove`, et pour OpenCode (qui n'a pas de `remove`) une
modification de son fichier de configuration global qui ne supprime que cette clé, en conservant les
commentaires et la mise en forme.

C'est la seule commande, avec `plane mcp config`, qui s'exécute sans configuration enregistrée, afin qu'un
client puisse être nettoyé après la disparition de la configuration. `--client` et `--dry-run` fonctionnent
comme dans `install`.

## `plane mcp start`, `stop` et `status`

`start` exécute le serveur HTTP détaché, et affiche son URL, son fichier de journal et la ligne `claude mcp add`
pour l'enregistrer. Il nécessite une configuration enregistrée. `--api-key`, `--base-url`, `--workspace` et
`--port` la remplacent pour cette exécution uniquement, et ne sont jamais enregistrées. `--foreground` sert au
premier plan, dans le processus courant.

`status` affiche si le serveur est en cours d'exécution, avec son URL, son pid et sa durée de fonctionnement, et
se termine avec le code 3 quand il ne l'est pas. `stop` demande au serveur de s'arrêter via un `POST /shutdown`
protégé par jeton, et ne signale le processus que si cela échoue.

## `plane mcp boot`

`boot enable` installe un service de l'utilisateur courant qui démarre le serveur à chaque connexion, sans
avoir besoin de sudo :

| Système d'exploitation | Service                                                                        |
| ---------------------- | ------------------------------------------------------------------------------ |
| Linux                  | une unité utilisateur systemd (sous WSL, activez systemd dans `/etc/wsl.conf`) |
| macOS                  | un LaunchAgent                                                                 |
| Windows                | une tâche à l'ouverture de session                                             |

Le service ne lit que la configuration enregistrée. `boot disable` le retire et `boot status` le signale.
