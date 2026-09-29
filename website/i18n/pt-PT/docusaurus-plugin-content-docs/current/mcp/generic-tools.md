---
sidebar_position: 5
title: Ferramentas genéricas
description: "plane_resources, plane_describe e plane_call: três ferramentas MCP que alcançam todos os métodos da API v2 nos 90 recursos."
---

# Ferramentas genéricas

Três ferramentas alcançam todos os métodos v2 do SDK, nos 90 recursos: cycles, modules, pages, releases,
initiatives, customers, webhooks e o resto. Ficam em `src/mcp/tools/generic.ts`.

1. **`plane_resources`** encontra um recurso. Sem `query`, lista todos os caminhos de recurso com os nomes dos
   métodos. Com uma (`"cycle work items"`, `"webhook"`), mostra os recursos correspondentes com as assinaturas
   dos métodos.
2. **`plane_describe`** recebe um `resource` e um `method` e mostra a assinatura completa: os parâmetros pela
   ordem da chamada (com os campos do corpo de escrita), quais são ids de caminho, os valores permitidos de
   `fields`/`expand`/`order_by`/filtros, e um exemplo de entrada para o `plane_call`.
3. **`plane_call`** executa o método, com os argumentos pelo nome do parâmetro.

Uma troca típica, tal como o agente a vê:

```json
{ "tool": "plane_resources", "arguments": { "query": "cycle" } }
{ "tool": "plane_describe", "arguments": { "resource": "workspaces.projects.cycles", "method": "list" } }
{
  "tool": "plane_call",
  "arguments": {
    "resource": "workspaces.projects.cycles",
    "method": "list",
    "args": { "slug": "acme", "project": "ENG", "params": { "per_page": 20 } }
  }
}
```

## `plane_call`

| Entrada    | Significado                                                                                                                |
| ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| `resource` | o caminho do recurso separado por pontos, por exemplo `workspaces.projects.states`                                         |
| `method`   | o nome do método, por exemplo `list`, `create`, `add`                                                                      |
| `args`     | os argumentos pelo nome do parâmetro: primeiro os ids de caminho (`slug`, `project`, …), depois os objetos `data`/`params` |
| `limit`    | em métodos `iterate`: quantos itens recolher (predefinição 100, no máximo 1000)                                            |
| `confirm`  | tem de ser `true` para executar um método destrutivo                                                                       |

`slug` usa por predefinição o workspace configurado. Os `params` de listagem aceitam `fields`, filtros,
`order_by`, `per_page` e `offset`. Um resultado com mais de 60.000 caracteres é cortado, com uma nota a
indicá-lo.

**Métodos destrutivos** (`delete`, `bulkDelete`, `remove`, `unlink`) recusam-se a correr sem `confirm: true`. A
descrição da ferramenta pede ao agente que pergunte primeiro ao utilizador.

## O catálogo

As ferramentas genéricas leem `src/mcp/generated/catalog.json`: os caminhos dos recursos, os nomes dos
parâmetros pela ordem da chamada e os valores permitidos do documento OpenAPI api_v2. É gerado a partir do
código do SDK pelo `pnpm codegen:mcp`, e nunca é editado à mão.

`plane_call` só alcança métodos do catálogo, e ordena os argumentos nomeados pelos nomes de parâmetro que
declara. Numa instância sem API v2, `plane_resources` e `plane_call` recusam com uma mensagem que aponta para
as ferramentas tipadas; `plane_describe` continua a funcionar, já que só lê o catálogo.
