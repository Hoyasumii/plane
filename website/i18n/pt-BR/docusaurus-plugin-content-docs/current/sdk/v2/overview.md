---
sidebar_position: 1
title: Visão geral da API v2
---

# Visão geral da API v2

`client.v2` dá acesso à superfície v2: 90 classes de recurso, geradas a partir do documento OpenAPI api_v2 do
Plane. Os recursos v1 do cliente continuam iguais (veja [API v1](../v1.md)).

Há **duas formas de acesso**, e os recursos são os mesmos nas duas:

1. **O caminho plano.** Cada recurso é um atributo, e cada id é um argumento.
2. **Linhas carregadas.** Uma linha buscada é onde moram os filhos dela. Veja [Linhas carregadas](./loaded-rows.md).

## O caminho plano

Um recurso fica pendurado no namespace na posição que a URL dele indica, e recebe os ids que a URL nomeia como
**argumentos posicionais iniciais**, na ordem do caminho:

```ts
import { PlaneClient } from "@hoyasumii/plane";

const client = new PlaneClient({ baseUrl: "https://api.plane.so", apiKey: "..." });

// GET /workspaces/acme/projects/ENG/states/
await client.v2.workspaces.projects.states.list("acme", "ENG");

// GET /workspaces/acme/projects/ENG/work-items/wi-1/comments/
await client.v2.workspaces.projects.workItems.comments.list("acme", "ENG", "wi-1");

// GET /workspaces/acme/teamspaces/
await client.v2.workspaces.teamspaces.list("acme");
```

`v2.workspaces` e `v2.workspaces.projects` são as duas raízes. Cada recurso fica em exatamente um caminho de
atributos, o que a URL dele nomeia: um recurso de workspace sob `v2.workspaces`, um de projeto sob
`v2.workspaces.projects`.

`project` aceita o UUID do projeto **ou** o identificador legível dele (`"ENG"`). Um work item pode ser
alcançado pela chave humana com `retrieveByIdentifier`. Nenhum método v2 recebe um objeto de opções com
`workspaceSlug` ou `project`: os ids do caminho são posicionais e sempre vêm primeiro, na ordem da URL, e todo o
resto vai no objeto `params` final.

```ts
// ENG-123, sem saber o projeto antes.
const item = await client.v2.workspaces.workItems.retrieveByIdentifier("acme", "ENG-123");
console.log(item.name);
```

## Os métodos padrão

A maioria dos recursos expõe alguns dos mesmos verbos, cada um com os ids do caminho primeiro:

| Método                                     | O que faz                                                             |
| ------------------------------------------ | --------------------------------------------------------------------- |
| `list(...ids, params?)`                    | uma página de linhas ([Paginação](./pagination.md))                   |
| `iterate(...ids, params?)`                 | um iterador assíncrono que percorre as páginas por você               |
| `retrieve(...ids, id, params?)`            | uma linha                                                             |
| `create(...ids, data, params?)`            | uma linha nova                                                        |
| `update(...ids, id, data, params?)`        | uma atualização parcial                                               |
| `upsert(...ids, data, params?)`            | cria, ou atualiza a linha com o mesmo `external_source`/`external_id` |
| `delete(...ids, id)`                       | remove a linha                                                        |
| `archive` / `unarchive`                    | em projetos e work items                                              |
| `bulkCreate` / `bulkUpdate` / `bulkDelete` | lotes ([Memberships e escritas em lote](./memberships-and-bulk.md))   |
| `findByName` e os outros `findBy*`         | exatamente uma linha por uma chave humana ([Buscas](./lookups.md))    |

Leituras e escritas que aceitam `fields` restringem o tipo de retorno aos campos pedidos
([Projeção de campos](./field-projection.md)). `expand` embute objetos relacionados, e `order_by` é validado
contra as ordenações da própria operação.

## Dados gerados

`v2.FIELDS`, `v2.EXPAND` e `v2.ORDER_BY` são os mapas completos de operation id → valores permitidos que os
encoders usam na validação (por exemplo, `v2.FIELDS["states_list"]` lista todo campo que `states.list` aceita).
`v2.OPENAPI_VERSION` é a versão do documento api_v2 a partir da qual o SDK foi gerado. Todos eles, mais os dois
limites `v2.BULK_MAX_ITEMS` e `v2.BRIDGE_MAX_IDS`, são exportados para que você possa enumerar os valores
válidos em vez de adivinhar.

```ts
import { v2 } from "@hoyasumii/plane";

console.log(v2.OPENAPI_VERSION, v2.FIELDS["states_list"]);
```
