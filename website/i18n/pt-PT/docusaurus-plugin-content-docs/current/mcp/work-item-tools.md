---
sidebar_position: 4
title: Ferramentas de work item
description: "Quatro ferramentas MCP tipadas para work items sobre a API v2, com os respetivos filtros, fields e expand."
---

# Ferramentas de work item

Quatro ferramentas tipadas cobrem os work items através da API v2, com os respetivos filtros, `fields` e
`expand`. Ficam em `src/mcp/tools/curated.ts`. Todo o resto passa pelas [ferramentas genéricas](./generic-tools.md).

| Ferramenta               | O que faz                                                                      |
| ------------------------ | ------------------------------------------------------------------------------ |
| `plane_list_work_items`  | os work items de um projeto, ou de todo o workspace quando `project` é omitido |
| `plane_get_work_item`    | um work item, pelo identificador (`ENG-123`) ou pelo UUID mais `project`       |
| `plane_create_work_item` | cria um work item num projeto                                                  |
| `plane_update_work_item` | altera os campos indicados, e envia só esses                                   |

`slug` é obrigatório, a menos que haja um workspace predefinido configurado. `project` é o UUID de um projeto ou
o respetivo identificador (`ENG`), e `workItem` um identificador como `ENG-123` ou um UUID. Com um identificador,
não é preciso indicar o projeto: é resolvido através da procura em todo o workspace.

## `plane_list_work_items`

| Entrada        | Significado                                                             |
| -------------- | ----------------------------------------------------------------------- |
| `project?`     | um projeto; se omitido, todo o workspace                                |
| `search?`      | procura em texto livre                                                  |
| `state_id?`    | um estado                                                               |
| `state_group?` | `backlog`, `unstarted`, `started`, `completed`, `cancelled` ou `triage` |
| `assignee_id?` | um responsável                                                          |
| `label_id?`    | uma label                                                               |
| `priority?`    | `none`, `low`, `medium`, `high` ou `urgent`                             |
| `cycle_id?`    | um cycle                                                                |
| `module_id?`   | um module                                                               |
| `order_by?`    | uma ordenação, por exemplo `-updated_at`                                |
| `fields?`      | apenas estes campos, por exemplo `["name", "state_id"]`                 |
| `per_page?`    | tamanho da página, 1–100                                                |
| `offset?`      | linhas a saltar, para a página seguinte                                 |

Para os filtros que estas entradas não cobrem, corra `plane_describe` sobre `workspaces.projects.workItems`
`list`.

## `plane_get_work_item`

`workItem`, mais `project` (só quando `workItem` é um UUID) e `expand` (objetos relacionados a incluir em linha,
por exemplo `["state", "labels"]`).

## `plane_create_work_item` e `plane_update_work_item`

As duas recebem `project` (create) ou `workItem` (update), e depois os campos do work item. `name` é obrigatório
no create.

| Campo                        | Significado                                                      |
| ---------------------------- | ---------------------------------------------------------------- |
| `name`                       | o título                                                         |
| `description_html`           | a descrição em HTML, por exemplo `<p>text</p>`                   |
| `state` / `state_id`         | o nome de um estado (`In Progress`) ou o respetivo id            |
| `priority`                   | `none`, `low`, `medium`, `high` ou `urgent`                      |
| `assignees` / `assignee_ids` | e-mails dos responsáveis, ou os respetivos ids                   |
| `labels` / `label_ids`       | nomes de labels, ou os respetivos ids                            |
| `parent`                     | o identificador ou o id do work item pai                         |
| `type`                       | o nome de um tipo de work item                                   |
| `start_date` / `target_date` | `YYYY-MM-DD`; a data-alvo não pode ser anterior à data de início |
| `estimate`                   | um valor de estimativa                                           |
| `cycle_id`                   | o id de um cycle, ou `null`                                      |

## Numa instância sem API v2

No Plane self-hosted 1.4.x, estas quatro ferramentas respondem através da v1 (`src/mcp/tools/work-items-v1.ts`)
com as mesmas entradas. Os parâmetros que só a v2 consegue servir (`cycle_id`, `module_id`, `order_by`, `fields`,
`expand`, `type`, `estimate`) falham pelo próprio nome em vez de serem ignorados.
