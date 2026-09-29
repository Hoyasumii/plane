---
sidebar_position: 3
title: Outils de tâche
description: "Les outils de tâche du MCP : les tâches par clé, et les projets, états, labels et membres par nom, avec une sortie lisible."
---

# Outils de tâche

Ces outils sont le contrat stable sur lequel s'appuient les flux d'agents pilotés par tâche. Ils prennent les
tâches par clé (`ACME-130`) et les projets, états, labels et membres par nom, et répondent une sortie lisible,
sans ids. Ils se trouvent dans `src/mcp/tools/kit.ts`.

Chaque outil prend un `slug` facultatif (l'espace de travail). Avec un espace de travail par défaut configuré
(`PLANE_WORKSPACE`), il peut être omis partout.

| Outil                    | Ce qu'il fait                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `plane_whoami`           | l'utilisateur de la clé, l'espace de travail, l'URL de base et l'API que l'instance sert (`v1`/`v2`)    |
| `plane_list_projects`    | les projets de l'espace de travail, avec l'identifiant utilisé dans les clés                            |
| `plane_list_my_issues`   | les tâches qui me sont assignées (ouvertes par défaut), dans un projet ou dans tous                     |
| `plane_search_issues`    | les tâches d'un projet par texte, assigné et groupe d'état                                              |
| `plane_get_issue`        | une tâche : état et groupe, priorité, assignés et labels par nom, dates, `url`, la description en texte |
| `plane_get_issue_images` | télécharge les images de la description vers `image-<n>.<ext>` (par défaut `<tmp>/plane-mcp/<KEY>/`)    |
| `plane_list_comments`    | les commentaires d'une tâche, du plus ancien au plus récent : auteur, date, texte                       |
| `plane_add_comment`      | commente en tant qu'utilisateur de la clé                                                               |
| `plane_create_issue`     | crée une tâche, en écrivant l'état, les labels et les assignés par nom                                  |
| `plane_update_issue`     | ne change que les champs fournis                                                                        |
| `plane_list_states`      | les états du projet, avec leur groupe                                                                   |
| `plane_list_labels`      | les labels du projet                                                                                    |
| `plane_list_members`     | qui peut être assigné : nom affiché et courriel                                                         |

Aucun de ces outils ne supprime quoi que ce soit.

## Entrées

| Outil                                                            | Entrées (à part `slug`)                                                                                                            |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `plane_list_my_issues`                                           | `project?`, `state_groups?` (par défaut : backlog, unstarted, started), `limit` (1–200, par défaut 50)                             |
| `plane_search_issues`                                            | `project`, `query?`, `assignee?` (nom, courriel ou `"me"`), `state_groups?`, `limit` (1–200, par défaut 30)                        |
| `plane_get_issue`                                                | `key`                                                                                                                              |
| `plane_get_issue_images`                                         | `key`, `dir?` (un dossier absolu, créé s'il n'existe pas)                                                                          |
| `plane_list_comments`                                            | `key`                                                                                                                              |
| `plane_add_comment`                                              | `key`, `text`, `format` (`"text"`, par défaut, ou `"markdown"`)                                                                    |
| `plane_create_issue`                                             | `project`, `title`, `description?`, `state?`, `priority?`, `assignees?`, `labels?`, `start_date?`, `target_date?`                  |
| `plane_update_issue`                                             | `key`, puis n'importe lequel parmi `title`, `description`, `state`, `priority`, `assignees`, `labels`, `start_date`, `target_date` |
| `plane_list_states` / `plane_list_labels` / `plane_list_members` | `project`                                                                                                                          |

Les groupes d'état sont `backlog`, `unstarted`, `started`, `completed` et `cancelled`. Les priorités sont
`urgent`, `high`, `medium`, `low` et `none`. Les dates sont au format `YYYY-MM-DD`.

## Comment les noms sont résolus

- **Les projets** par identifiant (`ACME`), nom ou id.
- **Les états** et **les labels** par nom, dans le projet de la tâche.
- **Les membres** par `"me"`, courriel, nom affiché, nom complet ou id.

Une valeur qui ne correspond à rien échoue avec la liste des options valides, pour que l'agent puisse se
corriger.

## Écriture

- `plane_create_issue` assigne l'utilisateur de la clé sauf si `assignees` est fourni (`[]` signifie personne).
- Dans `plane_update_issue`, `assignees` et `labels` remplacent la liste entière, `description` remplace la
  description entière, et une date `null` l'efface. Ne passer aucun champ du tout est une erreur.
- `description` est du texte brut : chaque ligne devient un paragraphe.
- Dans `plane_add_comment`, `format: "text"` fait un paragraphe par ligne; `format: "markdown"` rend le GFM
  (titres, listes, cases à cocher, gras) et échappe le HTML brut.

## Images

Dans `plane_get_issue`, chaque image de la description devient un repère `[image n]` dans le texte et est
listée dans `images`. `plane_get_issue_images` les enregistre dans le même ordre, sous la forme
`image-<n>.<ext>`, pour que l'agent puisse les ouvrir avec son outil de lecture de fichiers. Il détecte le type
depuis la signature du fichier et plafonne chaque fichier à 20 Mo. Une image échouée ou externe n'arrête pas les
autres.

Sur Plane 1.4.2, le téléchargement de ressource documenté (`GET /workspaces/<ws>/assets/<id>/`) répond 500. Le
serveur appelle donc `client.workItems.attachments.download`, qui lit la redirection depuis le détail de la
pièce jointe et suit l'URL signée sans envoyer la clé d'API.

## Limites de débit et mise en cache

Plane autorise 60 requêtes par minute. Sur un `429`, le serveur attend une fois le délai `Retry-After` (60 s
au maximum) et retente. Les projets, états, labels, membres et l'utilisateur courant sont mis en cache pendant
cinq minutes, partagés par chaque requête que le processus sert.
