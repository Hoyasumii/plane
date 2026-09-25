---
sidebar_position: 6
title: Paginação
---

# Paginação

`list()` responde uma página. `Page<T>` é uma união do envelope por offset (`total_count`, `next`) com o
envelope por cursor (`has_more`, `next_cursor`), e qual deles você recebe depende do parâmetro `paginate` da
requisição. Restrinja com `v2.isCursorPage` / `v2.isOffsetPage` antes de ler um campo específico de um dos
envelopes. Lê-lo sem restringir é um erro de compilação, já que ele pode não existir na outra metade da união:

```ts
import { v2 } from "@hoyasumii/plane";

const page = await client.v2.workspaces.projects.states.list("acme", "ENG");
if (v2.isOffsetPage(page)) {
  console.log(page.total_count); // só alcançável depois de restringir
} else if (v2.isCursorPage(page)) {
  console.log(page.next_cursor);
}
```

Toda página tem `data`, as próprias linhas.

## Os controles de paginação

Os params de listagem aceitam `per_page`, mais `offset` (paginação por offset) ou `paginate: "cursor"` com o
`cursor` da página anterior. `count: false` evita o cálculo de `total_count` numa página por offset.

```ts
const first = await client.v2.workspaces.projects.workItems.list("acme", "ENG", { per_page: 50, paginate: "cursor" });
if (v2.isCursorPage(first) && first.has_more) {
  await client.v2.workspaces.projects.workItems.list("acme", "ENG", {
    per_page: 50,
    paginate: "cursor",
    cursor: first.next_cursor ?? undefined,
  });
}
```

## `iterate`

`iterate` percorre as páginas por você e entrega linhas, então não aceita os controles que o próprio laço dele
define. As linhas de um recurso navegável continuam navegáveis:

```ts
for await (const item of client.v2.workspaces.projects.workItems.iterate("acme", "ENG", { per_page: 100 })) {
  console.log(item.name);
}
```
