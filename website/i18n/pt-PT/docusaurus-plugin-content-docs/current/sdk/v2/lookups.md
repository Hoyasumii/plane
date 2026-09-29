---
sidebar_position: 5
title: Procuras por chave humana
description: "Pesquisas que resolvem exatamente uma linha no servidor por nome, slug ou chave, e lançam um erro quando nada ou mais do que uma corresponde."
---

# Procuras por chave humana

Uma procura resolve exatamente uma linha no servidor, e lança um erro quando não há exatamente uma:
`NoMatchFoundError` quando nada corresponde, `MultipleMatchesFoundError` quando várias correspondem.

- `findByName` onde quer que a API filtre por `name`: states, labels, cycles, modules, projects, teamspaces,
  views, coleções da wiki, tipos e propriedades de work item, opções e contextos de propriedade, entre outros.
- `roles.findBySlug`, `estimates.points.findByKey`, `releases.tags.findByVersion`.
- `customerProperties.findByDisplayName`, ao lado de `findByName`.

```ts
await client.v2.workspaces.projects.states.findByName("acme", "ENG", "Todo");
await client.v2.workspaces.roles.findBySlug("acme", "admin", { namespace: "workspace" });
await client.v2.workspaces.projects.estimates.points.findByKey("acme", "ENG", estimateId, 3);
```

Em propriedades personalizadas, `name` é a chave de máquina (por exemplo, `story_points`), não o rótulo
apresentado na app.

Os dois erros estendem `PlaneError`, **não** `PlaneApiError`, pelo que capturar apenas `PlaneApiError` não os
captura:

```ts
import { MultipleMatchesFoundError, NoMatchFoundError } from "@hoyasumii/plane";

try {
  await client.v2.workspaces.projects.states.findByName("acme", "ENG", "Todo");
} catch (error) {
  if (error instanceof NoMatchFoundError) console.log("no such state");
  else if (error instanceof MultipleMatchesFoundError) console.log("the name is ambiguous");
  else throw error;
}
```
