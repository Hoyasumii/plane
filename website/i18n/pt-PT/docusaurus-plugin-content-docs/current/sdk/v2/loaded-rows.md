---
sidebar_position: 2
title: Linhas carregadas
description: "Linhas navegáveis na API v2: uma linha carregada traz os respetivos ids, pelo que os filhos são alcançados sem os voltar a passar."
---

# Linhas carregadas

Um recurso que tem filhos responde com **linhas navegáveis** em todos os métodos que devolvem linhas: os dados
da própria linha, mais uma propriedade por filho, com os ids que a produziram já preenchidos. Esta é a regra de
consumo de ids: _um id é passado uma vez, no momento em que é conhecido_. Um recurso sem filhos (`states`,
`labels`, `roles`) responde com o modelo simples, já que não há nada a alcançar a partir dele.

```ts
const workspace = await client.v2.workspaces.retrieve("acme");

await workspace.projects.list(); // sem slug
await workspace.teamspaces.list(); // sem slug

// E encadeia: um projeto obtido carrega ambos os ids.
const eng = await workspace.projects.retrieve("ENG");
await eng.states.list(); // sem slug, sem chave de projeto
await eng.workItems.create({ name: "Fix login bug", state: "Todo", labels: ["bug"] });

// Três níveis abaixo: um work item obtido carrega os três.
const item = await eng.workItems.retrieve("wi-1");
await item.comments.list();
```

O encadeamento funciona porque uma linha _sabe que ids a obtiveram_. `list` e `iterate` também devolvem linhas
navegáveis, pelo que paginar não faz perder a navegação:

```ts
for await (const project of client.v2.workspaces.projects.iterate("acme")) {
  await project.states.list(); // continua navegável
}
```

## O que uma linha carregada contém

Uma linha navegável tem o tipo `Loaded<Row, Navigation>`. Cada propriedade de navegação é uma vista
`Owned<Child, Ids>`: os métodos do próprio recurso filho, com os ids que a linha já tem retirados do início.
Assim, `eng.states.list()` é `client.v2.workspaces.projects.states.list("acme", "ENG")` com os dois primeiros
argumentos já preenchidos.

- **`row.$loaded`** transporta `ids`, `idNames` e `present`, o conjunto de nomes de campos que o servidor
  efetivamente devolveu. Tanto ele como as propriedades de navegação não são enumeráveis, pelo que `{ ...row }`,
  `Object.keys(row)` e `JSON.stringify(row)` veem apenas a linha simples da API.
- **Uma propriedade de navegação nunca encobre um campo.** Quando o nome natural de um filho já é um campo da
  linha, a propriedade é renomeada e o campo é mantido: `estimate.estimatePoints` (porque `?expand=points`
  devolve um campo `points` real) e `property.propertyOptions` (o mesmo para `options`). Construir uma linha que
  encobriria um campo lança um erro em vez de esconder dados.
- **Só os métodos sobrevivem à navegação.** Um recurso neto não é alcançável a partir de uma vista:
  `project.workItems.comments` não existe, porque um comentário precisa do próprio id do work item, que só um
  work item obtido carrega. Obtenha primeiro o work item.

```ts
const project = await client.v2.workspaces.projects.retrieve("acme", "ENG");
console.log(project.$loaded.ids, project.$loaded.present.has("name"));
console.log(JSON.stringify(project)); // a linha simples da API, sem navegação
```

## Onde a navegação termina

`wiki` e `groupSync` são nós de agrupamento, não recursos: não consomem nenhum id de caminho próprio, pelo que
não são propriedades de navegação numa linha de workspace obtida. Aceda a eles pelo caminho plano, como
`client.v2.workspaces.wiki` e `client.v2.workspaces.groupSync`.

`releases.labels` é o único local onde uma linha obtida e o caminho plano diferem. A classe reúne tanto o
catálogo de labels ao nível do workspace (`list`/`create`, apenas com o slug) como a ponte de membership de cada
release. Uma release obtida fixa a ponte, pelo que `release.labels.add(...)` funciona e `release.labels.list()`
não passa a verificação de tipos. Aceda ao catálogo pelo caminho plano.

## Chamadas navegadas não restringem `fields`

Uma chamada navegada aceita `fields`, mas responde com o tipo completo da linha. Esta é a única limitação desta
forma, e a razão pela qual o caminho plano se mantém público. Veja
[Projeção de campos](./field-projection.md#chamadas-navegadas-não-restringem).

## Não existe uma terceira forma

`client.v2.workspace(slug).project(key)`, a cadeia de localizadores que as pré-visualizações anteriores
transportavam, foi **eliminada**, não descontinuada. Não fixava nada: cada recurso recebe os respetivos ids em
cada chamada, pelo que `workspace(slug).roles.list(slug)` passava o slug duas vezes. Toda a família que detinha
já está em `v2.workspaces`.
