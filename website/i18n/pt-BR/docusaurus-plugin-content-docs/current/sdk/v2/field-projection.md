---
sidebar_position: 3
title: Projeção de campos
---

# Projeção de campos

`fields` restringe o **tipo de retorno**, não só a resposta. Peça dois campos e a linha que volta tem esses dois
mais o `id`. Ler qualquer outro é um erro de compilação, não um `undefined` em tempo de execução:

```ts
const page = await client.v2.workspaces.projects.states.list("acme", "ENG", { fields: ["id", "name"] });
for (const state of page.data) {
  console.log(state.id, state.name); // tipado: só id/name existem nesta linha
  // console.log(state.color);       // erro de compilação: `color` não foi pedido
}
```

Um array literal inline não precisa de `as const`. O mesmo vale para `iterate` e `retrieve` e, por ser a mesma
promessa, para **escritas**: `create`, `update` e `upsert` aceitam `fields` e restringem a resposta do mesmo
jeito.

```ts
const created = await client.v2.workspaces.projects.states.create(
  "acme",
  "ENG",
  { name: "In Review", color: "#4ECDC4" },
  { fields: ["id", "name"] }
);
console.log(created.name); // restrito; `created.color` não compilaria
```

## Listas de campos montadas em tempo de execução

Uma lista de campos montada em tempo de execução (não um literal) ainda precisa ser tipada como nomes de campo.
Um `string[]` simples **não** é atribuível a `readonly StateField[]` e falha com um longo erro de overload. A
linha é restringida ao **tipo do elemento** da lista, então tipe a variável tão estreita quanto você de fato
a usa:

```ts
import { PlaneClient, v2 } from "@hoyasumii/plane";

const client = new PlaneClient({ baseUrl: "https://api.plane.so", apiKey: "..." });

// Restrito a estes dois nomes, mesmo com o valor escolhido em tempo de execução.
const wanted: ("id" | "name")[] = includeColor ? ["id", "name"] : ["id"];
const page = await client.v2.workspaces.projects.states.list("acme", "ENG", { fields: wanted });

// Tipado como a união inteira, restringe a "todos os campos", ou seja, a linha completa.
const anything: v2.StateField[] = includeColor ? ["id", "name", "color"] : ["id", "name"];
const unnarrowed = await client.v2.workspaces.projects.states.list("acme", "ENG", { fields: anything });
```

`"all"` é um valor de campo válido que significa "todos os campos", e produz corretamente o tipo completo da
linha.

Respostas esparsas fazem com que todo campo de leitura, exceto `id`, seja opcional nos modelos. Verifique
`undefined` em vez de supor presença. Quando a lista foi montada dinamicamente, `row.$loaded.present` diz o que
de fato voltou.

## Chamadas navegadas não restringem

**Esta limitação é o motivo de a forma plana continuar pública.** Uma chamada navegada é resolvida contra a
assinatura geral, então aceita `fields`, mas **não** restringe:

```ts
const eng = await client.v2.workspaces.projects.retrieve("acme", "ENG");
const listed = await eng.states.list({ fields: ["id", "name"] }); // Page<State>, sem restrição
```

O TypeScript apaga um parâmetro de tipo quando infere através do tipo condicional por trás de uma propriedade de
navegação, então o overload que restringe não pode ser carregado junto. Reproduzir o conjunto de overloads seria
pior, não melhor: a inferência apagaria `F` até a restrição dele e afirmaria que _todos_ os campos estão
presentes. Quando quiser a linha restrita, chame o recurso pelo caminho plano:
`client.v2.workspaces.projects.states.list("acme", "ENG", { fields: [...] })`.

## `expand` e `order_by`

`expand` embute objetos relacionados (`{ expand: ["state", "labels"] }` num work item), validado contra os
valores permitidos da operação em `v2.EXPAND`.

`order_by` é validado do mesmo jeito que `fields`, contra uma união gerada (`StateOrderBy`, `LabelOrderBy`, …).
Um literal fora dessa união é um erro de compilação, e um valor montado em tempo de execução é recusado no
cliente por `encodeOrderBy` em vez de chegar ao servidor como um 400.

```ts
await client.v2.workspaces.projects.states.list("acme", "ENG", { order_by: "-created_at" });
```
