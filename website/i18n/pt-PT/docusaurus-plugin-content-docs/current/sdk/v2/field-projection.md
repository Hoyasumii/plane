---
sidebar_position: 3
title: Projeção de campos
description: "Como fields restringe o tipo de retorno em tempo de compilação, em leituras e escritas, e o único sítio onde a restrição não sobrevive."
---

# Projeção de campos

`fields` restringe o **tipo de retorno**, não só a resposta. Peça dois campos e a linha devolvida tem esses dois
mais o `id`. Ler qualquer outro campo é um erro de compilação, não um `undefined` em tempo de execução:

```ts
const page = await client.v2.workspaces.projects.states.list("acme", "ENG", { fields: ["id", "name"] });
for (const state of page.data) {
  console.log(state.id, state.name); // tipado: só existem id/name nesta linha
  // console.log(state.color);       // erro de compilação: `color` não foi pedido
}
```

Um array literal inline não precisa de `as const`. O mesmo vale para `iterate` e `retrieve` e, por ser a mesma
afirmação, para as **escritas**: `create`, `update` e `upsert` aceitam `fields` e restringem a resposta da mesma
forma.

```ts
const created = await client.v2.workspaces.projects.states.create(
  "acme",
  "ENG",
  { name: "In Review", color: "#4ECDC4" },
  { fields: ["id", "name"] }
);
console.log(created.name); // restrito; `created.color` não compilaria
```

## Listas de campos construídas em tempo de execução

Uma lista de campos construída em tempo de execução (não um literal) continua a precisar de ser tipada como
nomes de campo. Um `string[]` simples **não** é atribuível a `readonly StateField[]` e falha com um longo erro
de incompatibilidade de overload. A linha é restringida ao **tipo do elemento** da lista, por isso tipe a
variável de forma tão restrita quanto aquela que efetivamente utiliza:

```ts
import { PlaneClient, v2 } from "@hoyasumii/plane";

const client = new PlaneClient({ baseUrl: "https://api.plane.so", apiKey: "..." });

// Restringido a estes dois nomes, mesmo que o valor seja escolhido em tempo de execução.
const wanted: ("id" | "name")[] = includeColor ? ["id", "name"] : ["id"];
const page = await client.v2.workspaces.projects.states.list("acme", "ENG", { fields: wanted });

// Tipado como a união inteira, isto restringe a "todos os campos", ou seja, a linha completa.
const anything: v2.StateField[] = includeColor ? ["id", "name", "color"] : ["id", "name"];
const unnarrowed = await client.v2.workspaces.projects.states.list("acme", "ENG", { fields: anything });
```

`"all"` é um valor de campo válido que significa "todos os campos", e produz corretamente o tipo completo da
linha.

Respostas esparsas significam que todo campo de leitura, exceto `id`, é opcional nos modelos. Verifique se há
`undefined` em vez de presumir a presença. Quando a lista foi construída dinamicamente, `row.$loaded.present`
indica o que efetivamente voltou.

## Chamadas navegadas não restringem

**Esta limitação é a razão pela qual a forma plana se mantém pública.** Uma chamada navegada resolve-se contra a
assinatura geral, por isso aceita `fields`, mas **não** restringe:

```ts
const eng = await client.v2.workspaces.projects.retrieve("acme", "ENG");
const listed = await eng.states.list({ fields: ["id", "name"] }); // Page<State>, sem restrição
```

O TypeScript elimina um parâmetro de tipo quando infere através do tipo condicional por detrás de uma
propriedade de navegação, pelo que o overload que restringe não pode ser transportado. Reproduzir o conjunto de
overloads seria pior, não melhor: a inferência eliminaria `F` até à sua restrição e afirmaria que _todos_ os
campos estão presentes. Quando quiser a linha restrita, chame o recurso pelo caminho plano:
`client.v2.workspaces.projects.states.list("acme", "ENG", { fields: [...] })`.

## `expand` e `order_by`

`expand` embute objetos relacionados (`{ expand: ["state", "labels"] }` num work item), validado contra os
valores permitidos da operação em `v2.EXPAND`.

`order_by` é validado da mesma forma que `fields`, contra uma união gerada (`StateOrderBy`, `LabelOrderBy`, …).
Um literal fora dessa união é um erro de compilação, e um valor construído em tempo de execução é rejeitado do
lado do cliente por `encodeOrderBy`, em vez de chegar ao servidor como um 400.

```ts
await client.v2.workspaces.projects.states.list("acme", "ENG", { order_by: "-created_at" });
```
