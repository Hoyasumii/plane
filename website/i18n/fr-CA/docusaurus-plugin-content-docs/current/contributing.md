---
sidebar_position: 100
title: Contribuer
description: "Préparer le dépôt, lancer les vérifications et les tests, puis compiler et prévisualiser ce site de documentation."
---

# Contribuer

Le dépôt est [Hoyasumii/plane](https://github.com/Hoyasumii/plane), géré avec pnpm (Node.js 20 ou une version
ultérieure).

```bash
pnpm install          # dépendances, plus les hooks git (husky)
pnpm build            # compile vers dist/ et regroupe dist/types.bundle.d.ts
pnpm dev              # tsc --watch
pnpm test:unit        # tests unitaires (aucune instance Plane nécessaire)
pnpm check:lint       # oxlint (`pnpm fix:lint` corrige ce qu'il peut)
pnpm check:format     # oxfmt, 120 colonnes (`pnpm fix:format` réécrit)
pnpm check:knip       # fichiers, exports et dépendances inutilisés
```

Les vérifications tournent localement via des hooks git. `pre-commit`
exécute `check:lint` et `check:format`, `commit-msg` exécute commitlint avec la configuration conventionnelle
(`feat: …`, `fix(mcp): …`), et `pre-push` exécute `check:types`, `check:knip` et `test:unit`.

Chaque push sur `main` lance le workflow Continuous Delivery (`.github/workflows/cd.yml`). Il exécute les mêmes
vérifications et le build, puis :

- publie sur npm la version de `package.json` si elle n'est pas encore sur le registre (via Trusted Publishing,
  avec provenance), la tague `v<version>` et crée une release GitHub ;
- construit le site et le déploie sur la branche `gh-pages` quand le push touche `website/` ou `src/` (un
  lancement manuel du workflow le déploie toujours).

Pour publier une version, augmentez `version` dans `package.json` et fusionnez dans `main`.

## Compiler depuis les sources

`pnpm build` exécute `tsc` vers `dist/`, regroupe les définitions de types dans `dist/types.bundle.d.ts`, et
compare les exports de ce paquet à `scripts/__fixtures__/types-bundle-exports.snapshot.txt`. Si vous avez
changé les exports publics volontairement, mettez à jour l'instantané. Pour une recompilation propre :

```bash
pnpm clean            # supprime dist/ et node_modules/
pnpm install
pnpm build
```

Après avoir modifié quoi que ce soit sous `src/api/v2/`, exécutez `pnpm codegen:mcp` pour régénérer le catalogue
de méthodes que lit le serveur MCP (`src/mcp/generated/catalog.json`). `src/api/v2/generated/constants.ts` est
produit par `pnpm codegen:v2` à partir du document OpenAPI api_v2 : ne modifiez jamais l'un ou l'autre à la
main.

Pour essayer la compilation en local, exécutez `node dist/cli/index.js --help`, ou reliez-la avec `npm link` et
exécutez `plane --help`. `npm pack --dry-run` liste exactement ce qui serait publié.

## Tests

Les tests se trouvent dans `tests/unit/` et `tests/e2e/`. Les tests unitaires n'ont besoin d'aucune instance
Plane. Les tests de bout en bout ont besoin d'un `.env.test` avec de vrais ids :

```bash
cp env.example .env.test
```

Renseignez ensuite `TEST_WORKSPACE_SLUG`, `TEST_PROJECT_ID`, `TEST_USER_ID`, `TEST_WORK_ITEM_ID`,
`TEST_CUSTOMER_ID` et les autres ids que les suites demandent.

```bash
pnpm test                                 # tout
pnpm test:unit                            # tests unitaires seulement
pnpm test:e2e                             # tests de bout en bout seulement
pnpm test tests/unit/page.test.ts         # un seul fichier
```

Les tests s'exécutent un par un, pour rester sous la limite de débit de Plane.

## Comment la surface v2 reste fiable

La surface v2 comprend 90 classes de ressources, et rien n'y est vérifié au hasard. Des balayages de règles
tournent sur **chaque** classe, énumérée depuis la source TypeScript, et chacun est prouvé en introduisant la
violation et en observant le balayage la nommer :

| Balayage                      | Ce qu'il refuse                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Forme d'appel                 | une méthode qui ne commence pas par les ids de chemin de son URL, dans l'ordre du chemin                      |
| `fields` / `expand`           | une opération qui offre une projection que le SDK n'expose pas                                                |
| Filtres de requête            | un `?filter=` que l'API accepte et qu'aucun type de paramètres ne déclare                                     |
| `order_by`                    | un ordre de tri manquant, ou un type de paramètres qui pointe vers l'énumération d'un type voisin             |
| Pagination                    | une moitié inaccessible de l'enveloppe de pagination — y compris un `paginate` sans `cursor` pour le dépenser |
| Correspondance des opérations | une méthode sans entrée `operations`, silencieusement exemptée de tout ce qui précède                         |
| Solidité des projections      | une méthode qui accepte `fields` et répond quand même la ligne complète                                       |
| Routage du chargeur           | une méthode qui renvoie des lignes, sur une classe navigable, qui évite `load()`                              |
| Chemins alternatifs           | une méthode qui déclare une surcharge `extraPaths` et l'ignore                                                |
| Recherches                    | un `findBy*` qui filtre sur quelque chose que l'API ne filtre pas                                             |

Deux balayages supplémentaires couvrent l'arbre plutôt que les classes : la **complétude des bandes** exige
que chaque ressource soit rattachée à la racine que nomme son gabarit d'URL (et que rien d'étranger ne le soit),
et la **complétude de la navigation** exige qu'une ressource qui rattache un enfant réponde des lignes
navigables, avec une propriété par enfant et aucune propriété qui masque un champ réel. Chaque méthode vérifie
aussi son URL de requête exacte face à un serveur simulé.

La documentation est vérifiée aussi. `tests/unit/v2/readme-samples.test.ts` type-vérifie chaque bloc TypeScript
de `README.md`, `CLAUDE.md`, `AGENTS.MD` et chaque page de ce site, dans toutes les langues, face à la source du
SDK. Il vérifie aussi les affirmations en prose qui sont des faits sur le dépôt : les scripts qui existent,
les chemins qui existent, les noms `v2.` qui sont exportés, et les plafonds de lot qui correspondent au noyau.

## Ce site

Le site se trouve dans `website/`, un paquet d'espace de travail construit avec Docusaurus. Les guides sont du
Markdown dans `website/docs/`, chaque traduction les reflète dans `website/i18n/<locale>/`, et la référence
d'API est générée depuis `src/` par TypeDoc à chaque compilation.

```bash
pnpm docs:dev                        # aperçu en direct, en anglais
pnpm docs:dev --locale pt-BR         # aperçu en direct dans une autre langue (pt-PT, es-ES, zh-Hans, …)
pnpm docs:build                      # toutes les langues, dans website/build/
GIT_USER=<utilisateur-github> pnpm docs:deploy   # compile et pousse vers la branche gh-pages
```

La recherche (Ctrl/Cmd+K) s'appuie sur un index hors ligne, un par langue, que `pnpm docs:build` génère; elle ne
fonctionne pas sous `pnpm docs:dev`, essayez-la donc avec `pnpm docs:serve` après une compilation. La référence d'API
reste hors de l'index. La compilation anglaise écrit aussi `llms.txt` et `llms-full.txt` à la racine du site, à
partir des guides anglais, pour les outils d'IA. Ce sont des produits de compilation : ne les committez jamais et
ne les écrivez jamais à la main.
