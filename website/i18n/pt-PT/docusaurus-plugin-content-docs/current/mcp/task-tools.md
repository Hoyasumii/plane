---
sidebar_position: 3
title: Ferramentas de tarefas
description: "As ferramentas MCP de tarefas: tarefas pela chave, e projetos, estados, labels e membros pelo nome, com saída legível."
---

# Ferramentas de tarefas

Estas ferramentas são o contrato estável em que se apoiam os fluxos de trabalho de agentes orientados a tarefas.
Recebem tarefas pela chave (`ACME-130`) e projetos, estados, labels e membros pelo nome, e respondem com uma
saída legível, sem ids. Ficam em `src/mcp/tools/kit.ts`.

Toda a ferramenta recebe um `slug` (o workspace) opcional. Com um workspace predefinido configurado
(`PLANE_WORKSPACE`), pode ser omitido em todas.

| Ferramenta               | O que faz                                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `plane_whoami`           | o utilizador da chave, o workspace, o URL base e a API que a instância serve (`v1`/`v2`)                    |
| `plane_list_projects`    | os projetos do workspace, com o identificador usado nas chaves                                              |
| `plane_list_my_issues`   | as tarefas atribuídas a mim (as abertas, por predefinição), num projeto ou em todos                         |
| `plane_search_issues`    | as tarefas de um projeto por texto, responsável e grupo de estado                                           |
| `plane_get_issue`        | uma tarefa: estado e grupo, prioridade, responsáveis e labels pelo nome, datas, `url`, a descrição em texto |
| `plane_get_issue_images` | transfere as imagens da descrição como `image-<n>.<ext>` (predefinição `<tmp>/plane-mcp/<KEY>/`)            |
| `plane_list_comments`    | os comentários de uma tarefa, do mais antigo para o mais recente: autor, data, texto                        |
| `plane_add_comment`      | comenta como o utilizador da chave                                                                          |
| `plane_create_issue`     | cria uma tarefa, com estado, labels e responsáveis pelo nome                                                |
| `plane_update_issue`     | altera apenas os campos indicados                                                                           |
| `plane_list_states`      | os estados do projeto, com o grupo de cada um                                                               |
| `plane_list_labels`      | as labels do projeto                                                                                        |
| `plane_list_members`     | quem pode ser responsável: nome de apresentação e e-mail                                                    |

Nenhuma destas ferramentas apaga nada.

## Entradas

| Ferramenta                                                       | Entradas (além de `slug`)                                                                                              |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `plane_list_my_issues`                                           | `project?`, `state_groups?` (predefinição: backlog, unstarted, started), `limit` (1–200, predefinição 50)              |
| `plane_search_issues`                                            | `project`, `query?`, `assignee?` (nome, e-mail ou `"me"`), `state_groups?`, `limit` (1–200, predefinição 30)           |
| `plane_get_issue`                                                | `key`                                                                                                                  |
| `plane_get_issue_images`                                         | `key`, `dir?` (uma pasta absoluta, criada se não existir)                                                              |
| `plane_list_comments`                                            | `key`                                                                                                                  |
| `plane_add_comment`                                              | `key`, `text`, `format` (`"text"`, a predefinição, ou `"markdown"`)                                                    |
| `plane_create_issue`                                             | `project`, `title`, `description?`, `state?`, `priority?`, `assignees?`, `labels?`, `start_date?`, `target_date?`      |
| `plane_update_issue`                                             | `key` e qualquer um de `title`, `description`, `state`, `priority`, `assignees`, `labels`, `start_date`, `target_date` |
| `plane_list_states` / `plane_list_labels` / `plane_list_members` | `project`                                                                                                              |

Os grupos de estado são `backlog`, `unstarted`, `started`, `completed` e `cancelled`. As prioridades são
`urgent`, `high`, `medium`, `low` e `none`. As datas são `YYYY-MM-DD`.

## Como os nomes são resolvidos

- **Projetos** pelo identificador (`ACME`), pelo nome ou pelo id.
- **Estados** e **labels** pelo nome, dentro do projeto da tarefa.
- **Membros** por `"me"`, e-mail, nome de apresentação, nome completo ou id.

Um valor que não corresponda a nada falha com a lista das opções válidas, para que o agente se possa corrigir.

## Escrita

- `plane_create_issue` atribui ao utilizador da chave, a menos que `assignees` seja indicado (`[]` significa
  ninguém).
- Em `plane_update_issue`, `assignees` e `labels` substituem a lista inteira, `description` substitui a
  descrição inteira, e uma data `null` limpa-a. Não indicar nenhum campo é um erro.
- `description` é texto simples: cada linha torna-se um parágrafo.
- Em `plane_add_comment`, `format: "text"` faz um parágrafo por linha; `format: "markdown"` renderiza GFM
  (títulos, listas, checkboxes, negrito) e escapa HTML em bruto.

## Imagens

Em `plane_get_issue`, cada imagem da descrição transforma-se num marcador `[image n]` no texto e é listada em
`images`. O `plane_get_issue_images` guarda-as pela mesma ordem, como `image-<n>.<ext>`, para que o agente as
possa abrir com a respetiva ferramenta de leitura de ficheiros. Deteta o tipo pela assinatura do ficheiro e
limita cada ficheiro a 20 MB. Uma imagem que falhe ou seja externa não impede as outras.

No Plane 1.4.2, a transferência de asset documentada (`GET /workspaces/<ws>/assets/<id>/`) responde 500. Por
isso, o servidor chama `client.workItems.attachments.download`, que lê o redirecionamento a partir do detalhe do
anexo e segue o URL assinado sem enviar a chave de API.

## Limites de taxa e cache

O Plane permite 60 pedidos por minuto. Num `429`, o servidor espera pelo `Retry-After` uma vez (60 s no máximo)
e tenta novamente. Projetos, estados, labels, membros e o utilizador atual ficam em cache durante cinco minutos,
partilhados por todos os pedidos que o processo atende.
