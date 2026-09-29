---
sidebar_position: 9
title: Tipos
description: "Dónde están los tipos de la API v2: los namespaces v2 y v2models, y los alias con prefijo V2 en la raíz del paquete."
---

# Tipos

Se puede llegar a los tipos de v2 a través de los namespaces `v2` y `v2models` (por ejemplo, `v2models.State` y
`v2.StateField`). Los más comunes también tienen un alias en la raíz del paquete: `V2Label`, `V2State`,
`V2Project`, `V2Workspace`, `V2WorkItem`, `V2Cycle`, `V2Module`, `V2Milestone`, `V2ListStatesParams` y
`V2ListLabelsParams`, y los modelos de petición `V2Create*`/`V2Update*`.

Usa esos nombres. Los nombres simples de v2 `Label`/`State`/`Project`/`Workspace`/`Page` chocan con los de v1 en
las definiciones de tipos empaquetadas, así que `import { Workspace } from "@hoyasumii/plane"` resuelve a la
forma de **v1**, no a la de v2. `V2Page` es el modelo de página de la wiki, y el sobre de paginación `Page<T>`
tiene su propio alias como `V2PageEnvelope`.

```ts
import type { V2PageEnvelope, V2State, v2, v2models } from "@hoyasumii/plane";

const fields: v2.StateField[] = ["id", "name"];
const page: V2PageEnvelope<V2State> = await client.v2.workspaces.projects.states.list("acme", "ENG");
const first: v2models.State | undefined = page.data[0];
```

Los tipos a los que resuelve una fila navegable también se exportan bajo `v2`: `v2.LoadedProject`,
`v2.ProjectNavigation`, `v2.ProjectIds`, `v2.PROJECT_ID_NAMES`, y el mismo conjunto para cada familia, además de
los tipos de kernel `v2.Loaded`, `v2.Owned` y `v2.LoadedMeta`.

Los modelos de lectura marcan como opcional todo campo salvo `id`, porque `?fields=` y el diferimiento de
colecciones pueden omitir cualquiera de ellos.

Para la lista completa de clases, modelos y helpers exportados, consulta la
[referencia de la API](pathname:///plane/docs/api).
