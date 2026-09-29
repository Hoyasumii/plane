---
sidebar_position: 9
title: Types
description: "Où se trouvent les types de l'API v2 : les espaces de noms v2 et v2models, et les alias préfixés par V2 à la racine du paquet."
---

# Types

Les types v2 sont accessibles via les namespaces `v2` et `v2models` (par exemple, `v2models.State` et
`v2.StateField`). Les plus courants sont aussi aliasés à la racine du paquet : `V2Label`, `V2State`,
`V2Project`, `V2Workspace`, `V2WorkItem`, `V2Cycle`, `V2Module`, `V2Milestone`, `V2ListStatesParams` et
`V2ListLabelsParams`, et les modèles de requête `V2Create*`/`V2Update*`.

Utilisez ces noms. Les noms nus `Label`/`State`/`Project`/`Workspace`/`Page` de la v2 entrent en collision avec
ceux de la v1 dans les définitions de types regroupées, donc `import { Workspace } from "@hoyasumii/plane"` se
résout vers la forme de **la v1**, pas celle de la v2. `V2Page` est le modèle de page du wiki, et l'enveloppe
de pagination `Page<T>` est aliasée séparément comme `V2PageEnvelope`.

```ts
import type { V2PageEnvelope, V2State, v2, v2models } from "@hoyasumii/plane";

const fields: v2.StateField[] = ["id", "name"];
const page: V2PageEnvelope<V2State> = await client.v2.workspaces.projects.states.list("acme", "ENG");
const first: v2models.State | undefined = page.data[0];
```

Les types vers lesquels se résout une ligne navigable sont aussi exportés sous `v2` : `v2.LoadedProject`,
`v2.ProjectNavigation`, `v2.ProjectIds`, `v2.PROJECT_ID_NAMES`, et le même ensemble pour chaque famille, plus
les types de noyau `v2.Loaded`, `v2.Owned` et `v2.LoadedMeta`.

Les modèles de lecture marquent chaque champ, sauf `id`, comme facultatif, car `?fields=` et le report de
collection peuvent en omettre n'importe lequel.

Pour la liste complète des classes, modèles et fonctions utilitaires exportés, voir la
[référence de l'API](pathname:///plane/docs/api).
