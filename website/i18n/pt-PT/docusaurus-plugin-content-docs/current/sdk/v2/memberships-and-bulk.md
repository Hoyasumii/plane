---
sidebar_position: 4
title: Memberships e escritas em lote
description: "Pontes de associação (add e remove, até 100 ids) e escritas em lote (até 50 itens) na API v2, e porque é que os limites diferem."
---

# Memberships e escritas em lote

**Há dois limites de lote, e são números diferentes.**

| Lote                    | Limite                         | Métodos                                             |
| ----------------------- | ------------------------------ | --------------------------------------------------- |
| Uma ponte de membership | `v2.BRIDGE_MAX_IDS` (100) ids  | `add` / `remove` (e `link` em propriedades de tipo) |
| Uma escrita em lote     | `v2.BULK_MAX_ITEMS` (50) itens | `bulkCreate` / `bulkUpdate` / `bulkDelete`          |

O primeiro é o `maxItems` do golden nos 24 schemas de `add`/`remove`; o segundo é o `maxItems` nos 21 schemas de
create/update/delete em lote. Dimensionar uma chamada de ponte em 50 funciona, mas desperdiça metade de cada ida
e volta; dimensionar uma chamada em lote em 100 lança um erro no lado do cliente.

## Memberships

Memberships são `add`/`remove` num sub-recurso com o nome da coisa a adicionar: primeiro os ids de caminho,
depois 1..100 ids (`BRIDGE_MAX_IDS`). Uma lista vazia ou demasiado grande lança um erro antes de qualquer
pedido. Cada chamada envia apenas o respetivo verbo e resolve para os ids que o servidor efetivamente alterou.

```ts
const v2ns = client.v2;

await v2ns.workspaces.projects.cycles.workItems.add("acme", "ENG", cycleId, [itemId]); // -> ["<item id>"]
await v2ns.workspaces.projects.modules.workItems.remove("acme", "ENG", moduleId, [itemId]);
await v2ns.workspaces.releases.labels.add("acme", releaseId, [labelId]);
await v2ns.workspaces.initiatives.projects.add("acme", initiativeId, [projectId]);
await v2ns.workspaces.wiki.collections.members.add("acme", collectionId, [{ member_id: userId, access: 1 }]);
```

Propriedades de um tipo de work item usam `link`/`unlink` em vez disso, à semelhança da app web. `unlink` apaga
os valores dessa propriedade em todos os work items do tipo.

```ts
await client.v2.workspaces.projects.workItemTypes.properties.link("acme", "ENG", typeId, [propertyId]);
await client.v2.workspaces.projects.workItemTypes.properties.unlink("acme", "ENG", typeId, propertyId);
```

## Escritas em lote

`bulkCreate` / `bulkUpdate` / `bulkDelete` respondem sempre HTTP 200, mesmo quando algumas linhas falham: o
sucesso parcial é a predefinição. A resposta conta `succeeded` e `failed` e tem uma entrada por linha em
`results`. Chame `v2.raiseForFailures(result)` para lançar um `PlaneApiError` com os `errors` da primeira falha,
ou leia as linhas que falharam com `v2.bulkFailures(result)`.

O limite é de 50 itens por chamada (`BULK_MAX_ITEMS`), não os 100 que uma ponte de membership aceita. Um lote
vazio é rejeitado no lado do cliente, em vez de se transformar numa operação silenciosa sem efeito.

```ts
import { v2 } from "@hoyasumii/plane";

const result = await client.v2.workspaces.projects.states.bulkCreate("acme", "ENG", [{ name: "QA", color: "#ffffff" }]);
v2.raiseForFailures(result);

// Cada item de bulkUpdate é o patch mais o id de destino.
await client.v2.workspaces.projects.states.bulkUpdate("acme", "ENG", [{ id: "state-1", color: "#000000" }]);
```

Todo o método em lote recebe um último argumento `allOrNone` (predefinição `false`). Passe `true` para pedir ao
servidor que aplique todas as linhas ou nenhuma delas.

Para escrever mais de 50 linhas, divida-as manualmente:

```ts
import { v2, v2models } from "@hoyasumii/plane";

const rows: v2models.CreateState[] = [{ name: "QA", color: "#ffffff" }];

for (let start = 0; start < rows.length; start += v2.BULK_MAX_ITEMS) {
  const chunk = rows.slice(start, start + v2.BULK_MAX_ITEMS);
  v2.raiseForFailures(await client.v2.workspaces.projects.states.bulkCreate("acme", "ENG", chunk));
}
```
