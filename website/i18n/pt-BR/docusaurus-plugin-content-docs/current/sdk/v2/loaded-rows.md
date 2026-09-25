---
sidebar_position: 2
title: Linhas carregadas
---

# Linhas carregadas

Um recurso que tem filhos responde **linhas navegáveis** em todo método que devolve linhas: os dados da própria
linha, mais uma propriedade por filho, com os ids que a produziram já preenchidos. É a regra de consumo de ids:
_um id é passado uma vez, no ponto em que é conhecido_. Um recurso sem filhos (`states`, `labels`, `roles`)
responde o modelo simples, já que não há nada a alcançar a partir dele.

```ts
const workspace = await client.v2.workspaces.retrieve("acme");

await workspace.projects.list(); // sem slug
await workspace.teamspaces.list(); // sem slug

// E encadeia: um projeto buscado carrega os dois ids.
const eng = await workspace.projects.retrieve("ENG");
await eng.states.list(); // sem slug, sem chave de projeto
await eng.workItems.create({ name: "Fix login bug", state: "Todo", labels: ["bug"] });

// Três níveis abaixo: um work item buscado carrega os três.
const item = await eng.workItems.retrieve("wi-1");
await item.comments.list();
```

O encadeamento funciona porque uma linha _sabe quais ids a buscaram_. `list` e `iterate` também devolvem linhas
navegáveis, então paginar não perde a navegação:

```ts
for await (const project of client.v2.workspaces.projects.iterate("acme")) {
  await project.states.list(); // continua navegável
}
```

## O que uma linha carregada carrega

Uma linha navegável tem o tipo `Loaded<Row, Navigation>`. Cada propriedade de navegação é uma visão
`Owned<Child, Ids>`: os métodos do próprio recurso filho, sem os ids que a linha já tem no começo. Assim,
`eng.states.list()` é `client.v2.workspaces.projects.states.list("acme", "ENG")` com os dois primeiros
argumentos já preenchidos.

- **`row.$loaded`** carrega `ids`, `idNames` e `present`, o conjunto de nomes de campo que o servidor de fato
  devolveu. Ele e as propriedades de navegação são não enumeráveis, então `{ ...row }`, `Object.keys(row)` e
  `JSON.stringify(row)` enxergam a linha pura da API.
- **Uma propriedade de navegação nunca encobre um campo.** Quando o nome natural de um filho já é um campo da
  linha, a propriedade é renomeada e o campo é mantido: `estimate.estimatePoints` (porque `?expand=points` devolve
  um campo `points` de verdade) e `property.propertyOptions` (idem para `options`). Montar uma linha que
  encobriria um campo lança erro em vez de esconder dados.
- **Só métodos sobrevivem à navegação.** Um recurso neto não é alcançável a partir de uma visão:
  `project.workItems.comments` não existe, porque um comentário precisa do id do próprio work item, que só um
  work item buscado carrega. Busque o work item primeiro.

```ts
const project = await client.v2.workspaces.projects.retrieve("acme", "ENG");
console.log(project.$loaded.ids, project.$loaded.present.has("name"));
console.log(JSON.stringify(project)); // a linha pura da API, sem navegação
```

## Onde a navegação para

`wiki` e `groupSync` são nós de agrupamento, não recursos: não consomem nenhum id de caminho próprio, então não
são propriedades de navegação numa linha de workspace buscada. Acesse-os pelo caminho plano, como
`client.v2.workspaces.wiki` e `client.v2.workspaces.groupSync`.

`releases.labels` é o único lugar onde uma linha buscada e o caminho plano diferem. A classe reúne o catálogo de
labels do workspace (`list`/`create`, só com o slug) e a ponte de membership de cada release. Uma release buscada
fixa a ponte, então `release.labels.add(...)` funciona e `release.labels.list()` não passa na checagem de
tipos. Acesse o catálogo pelo caminho plano.

## Chamadas navegadas não restringem `fields`

Uma chamada navegada aceita `fields`, mas responde o tipo completo da linha. Essa é a única limitação dessa
forma, e o motivo de o caminho plano continuar público. Veja
[Projeção de campos](./field-projection.md#chamadas-navegadas-não-restringem).

## Não existe uma terceira forma

`client.v2.workspace(slug).project(key)`, a cadeia de localizadores das prévias anteriores, foi **removida**,
não descontinuada. Ela não fixava nada: cada recurso recebe seus ids a cada chamada, então
`workspace(slug).roles.list(slug)` passava o slug duas vezes. Toda família que ela tinha já está em
`v2.workspaces`.
