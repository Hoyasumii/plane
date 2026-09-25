---
sidebar_position: 4
title: Ferramentas de work item
---

# Ferramentas de work item

Quatro ferramentas tipadas cobrem work items pela API v2, com os filtros, `fields` e `expand` dela. Ficam em
`src/mcp/tools/curated.ts`. Todo o resto passa pelas [ferramentas genéricas](./generic-tools.md).

| Ferramenta               | O que faz                                                                       |
| ------------------------ | ------------------------------------------------------------------------------- |
| `plane_list_work_items`  | os work items de um projeto, ou do workspace inteiro quando `project` é omitido |
| `plane_get_work_item`    | um work item, pelo identificador (`ENG-123`) ou pelo UUID mais `project`        |
| `plane_create_work_item` | cria um work item num projeto                                                   |
| `plane_update_work_item` | altera os campos informados, e envia só esses                                   |

`slug` é obrigatório, a menos que haja um workspace padrão configurado. `project` é o UUID de um projeto ou o
identificador dele (`ENG`), e `workItem` um identificador como `ENG-123` ou um UUID. Com um identificador, não é
preciso informar o projeto: ele é resolvido pela busca no workspace inteiro.

## `plane_list_work_items`

| Entrada        | Significado                                                             |
| -------------- | ----------------------------------------------------------------------- |
| `project?`     | um projeto; omitido, o workspace inteiro                                |
| `search?`      | busca em texto livre                                                    |
| `state_id?`    | um estado                                                               |
| `state_group?` | `backlog`, `unstarted`, `started`, `completed`, `cancelled` ou `triage` |
| `assignee_id?` | um responsável                                                          |
| `label_id?`    | uma label                                                               |
| `priority?`    | `none`, `low`, `medium`, `high` ou `urgent`                             |
| `cycle_id?`    | um cycle                                                                |
| `module_id?`   | um module                                                               |
| `order_by?`    | uma ordenação, por exemplo `-updated_at`                                |
| `fields?`      | só estes campos, por exemplo `["name", "state_id"]`                     |
| `per_page?`    | tamanho da página, 1–100                                                |
| `offset?`      | linhas a pular, para a próxima página                                   |

Para os filtros que essas entradas não cobrem, rode `plane_describe` em `workspaces.projects.workItems` `list`.

## `plane_get_work_item`

`workItem`, mais `project` (só quando `workItem` é um UUID) e `expand` (objetos relacionados a embutir, por
exemplo `["state", "labels"]`).

## `plane_create_work_item` e `plane_update_work_item`

As duas recebem `project` (create) ou `workItem` (update) e depois os campos do work item. `name` é obrigatório
no create.

| Campo                        | Significado                                                    |
| ---------------------------- | -------------------------------------------------------------- |
| `name`                       | o título                                                       |
| `description_html`           | a descrição em HTML, por exemplo `<p>text</p>`                 |
| `state` / `state_id`         | o nome de um estado (`In Progress`) ou o id dele               |
| `priority`                   | `none`, `low`, `medium`, `high` ou `urgent`                    |
| `assignees` / `assignee_ids` | e-mails dos responsáveis, ou os ids deles                      |
| `labels` / `label_ids`       | nomes de labels, ou os ids delas                               |
| `parent`                     | o identificador ou o id do work item pai                       |
| `type`                       | o nome de um tipo de work item                                 |
| `start_date` / `target_date` | `YYYY-MM-DD`; a data alvo não pode vir antes da data de início |
| `estimate`                   | um valor de estimativa                                         |
| `cycle_id`                   | o id de um cycle, ou `null`                                    |

## Numa instância sem API v2

No Plane self-hosted 1.4.x, essas quatro ferramentas respondem pela v1 (`src/mcp/tools/work-items-v1.ts`) com as
mesmas entradas. Os parâmetros que só a v2 atende (`cycle_id`, `module_id`, `order_by`, `fields`, `expand`,
`type`, `estimate`) falham com o próprio nome em vez de serem ignorados.
