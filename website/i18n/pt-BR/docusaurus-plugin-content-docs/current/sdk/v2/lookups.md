---
sidebar_position: 5
title: Buscas por chave humana
---

# Buscas por chave humana

Uma busca resolve exatamente uma linha no servidor e lança erro quando não há exatamente uma:
`NoMatchFoundError` quando nada corresponde, `MultipleMatchesFoundError` quando várias correspondem.

- `findByName` onde quer que a API filtre por `name`: states, labels, cycles, modules, projects, teamspaces,
  views, coleções da wiki, tipos e propriedades de work item, opções e contextos de propriedade, e outros.
- `roles.findBySlug`, `estimates.points.findByKey`, `releases.tags.findByVersion`.
- `customerProperties.findByDisplayName`, ao lado de `findByName`.

```ts
await client.v2.workspaces.projects.states.findByName("acme", "ENG", "Todo");
await client.v2.workspaces.roles.findBySlug("acme", "admin", { namespace: "workspace" });
await client.v2.workspaces.projects.estimates.points.findByKey("acme", "ENG", estimateId, 3);
```

Em propriedades customizadas, `name` é a chave de máquina (por exemplo, `story_points`), não o rótulo mostrado no
app.

Os dois erros estendem `PlaneError`, **não** `PlaneApiError`, então capturar só `PlaneApiError` não os pega:

```ts
import { MultipleMatchesFoundError, NoMatchFoundError } from "@hoyasumii/plane";

try {
  await client.v2.workspaces.projects.states.findByName("acme", "ENG", "Todo");
} catch (error) {
  if (error instanceof NoMatchFoundError) console.log("estado não existe");
  else if (error instanceof MultipleMatchesFoundError) console.log("o nome é ambíguo");
  else throw error;
}
```
