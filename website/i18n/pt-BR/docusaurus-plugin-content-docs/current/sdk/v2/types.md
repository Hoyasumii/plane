---
sidebar_position: 9
title: Tipos
---

# Tipos

Os tipos v2 são acessíveis pelos namespaces `v2` e `v2models` (por exemplo, `v2models.State` e
`v2.StateField`). Os mais comuns também têm alias na raiz do pacote: `V2Label`, `V2State`, `V2Project`,
`V2Workspace`, `V2WorkItem`, `V2Cycle`, `V2Module`, `V2Milestone`, `V2ListStatesParams` e `V2ListLabelsParams`,
além dos modelos de requisição `V2Create*`/`V2Update*`.

Use esses nomes. Os nomes simples `Label`/`State`/`Project`/`Workspace`/`Page` da v2 colidem com os da v1 nas
definições de tipo empacotadas, então `import { Workspace } from "@hoyasumii/plane"` resolve para o formato **da
v1**, não da v2. `V2Page` é o modelo de página da wiki, e o envelope de paginação `Page<T>` tem um alias separado,
`V2PageEnvelope`.

```ts
import type { V2PageEnvelope, V2State, v2, v2models } from "@hoyasumii/plane";

const fields: v2.StateField[] = ["id", "name"];
const page: V2PageEnvelope<V2State> = await client.v2.workspaces.projects.states.list("acme", "ENG");
const first: v2models.State | undefined = page.data[0];
```

Os tipos em que uma linha navegável se resolve também são exportados sob `v2`: `v2.LoadedProject`,
`v2.ProjectNavigation`, `v2.ProjectIds`, `v2.PROJECT_ID_NAMES` e o mesmo conjunto para cada família, mais os
tipos do kernel `v2.Loaded`, `v2.Owned` e `v2.LoadedMeta`.

Os modelos de leitura marcam todo campo exceto `id` como opcional, porque `?fields=` e o adiamento de coleções
podem omitir qualquer um deles.

Para a lista completa de classes, modelos e helpers exportados, veja a [referência da API](/docs/api).
