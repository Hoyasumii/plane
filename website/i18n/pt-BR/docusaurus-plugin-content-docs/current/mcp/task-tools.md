---
sidebar_position: 3
title: Ferramentas de tarefa
---

# Ferramentas de tarefa

Estas ferramentas são o contrato estável em que os fluxos de agentes baseados em tarefas se apoiam. Recebem
tarefas pela chave (`ACME-130`) e projetos, estados, labels e membros pelo nome, e respondem uma saída legível,
sem ids. Ficam em `src/mcp/tools/kit.ts`.

Toda ferramenta recebe um `slug` (o workspace) opcional. Com um workspace padrão configurado
(`PLANE_WORKSPACE`), ele pode ser omitido em todas.

| Ferramenta               | O que faz                                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `plane_whoami`           | o usuário da chave, o workspace, a URL base e a API que a instância serve (`v1`/`v2`)                       |
| `plane_list_projects`    | os projetos do workspace, com o identificador usado nas chaves                                              |
| `plane_list_my_issues`   | as tarefas atribuídas a mim (as abertas, por padrão), num projeto ou em todos                               |
| `plane_search_issues`    | as tarefas de um projeto por texto, responsável e grupo de estado                                           |
| `plane_get_issue`        | uma tarefa: estado e grupo, prioridade, responsáveis e labels pelo nome, datas, `url`, a descrição em texto |
| `plane_get_issue_images` | baixa as imagens da descrição como `image-<n>.<ext>` (padrão `<tmp>/plane-mcp/<KEY>/`)                      |
| `plane_list_comments`    | os comentários de uma tarefa, do mais antigo ao mais novo: autor, data, texto                               |
| `plane_add_comment`      | comenta como o usuário da chave                                                                             |
| `plane_create_issue`     | cria uma tarefa, com estado, labels e responsáveis pelo nome                                                |
| `plane_update_issue`     | altera só os campos informados                                                                              |
| `plane_list_states`      | os estados do projeto, com o grupo de cada um                                                               |
| `plane_list_labels`      | as labels do projeto                                                                                        |
| `plane_list_members`     | quem pode ser responsável: nome de exibição e e-mail                                                        |

Nenhuma dessas ferramentas apaga nada.

## Entradas

| Ferramenta                                                       | Entradas (além de `slug`)                                                                                              |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `plane_list_my_issues`                                           | `project?`, `state_groups?` (padrão: backlog, unstarted, started), `limit` (1–200, padrão 50)                          |
| `plane_search_issues`                                            | `project`, `query?`, `assignee?` (nome, e-mail ou `"me"`), `state_groups?`, `limit` (1–200, padrão 30)                 |
| `plane_get_issue`                                                | `key`                                                                                                                  |
| `plane_get_issue_images`                                         | `key`, `dir?` (uma pasta absoluta, criada se não existir)                                                              |
| `plane_list_comments`                                            | `key`                                                                                                                  |
| `plane_add_comment`                                              | `key`, `text`, `format` (`"text"`, o padrão, ou `"markdown"`)                                                          |
| `plane_create_issue`                                             | `project`, `title`, `description?`, `state?`, `priority?`, `assignees?`, `labels?`, `start_date?`, `target_date?`      |
| `plane_update_issue`                                             | `key` e qualquer um de `title`, `description`, `state`, `priority`, `assignees`, `labels`, `start_date`, `target_date` |
| `plane_list_states` / `plane_list_labels` / `plane_list_members` | `project`                                                                                                              |

Os grupos de estado são `backlog`, `unstarted`, `started`, `completed` e `cancelled`. As prioridades são
`urgent`, `high`, `medium`, `low` e `none`. As datas são `YYYY-MM-DD`.

## Como os nomes são resolvidos

- **Projetos** pelo identificador (`ACME`), pelo nome ou pelo id.
- **Estados** e **labels** pelo nome, dentro do projeto da tarefa.
- **Membros** por `"me"`, e-mail, nome de exibição, nome completo ou id.

Um valor que não corresponde a nada falha com a lista das opções válidas, para que o agente possa se corrigir.

## Escrita

- `plane_create_issue` atribui ao usuário da chave, a menos que `assignees` seja informado (`[]` significa
  ninguém).
- Em `plane_update_issue`, `assignees` e `labels` substituem a lista inteira, `description` substitui a descrição
  inteira, e uma data `null` a limpa. Não informar nenhum campo é um erro.
- `description` é texto puro: cada linha vira um parágrafo.
- Em `plane_add_comment`, `format: "text"` faz um parágrafo por linha; `format: "markdown"` renderiza GFM
  (títulos, listas, checkboxes, negrito) e escapa HTML cru.

## Imagens

Em `plane_get_issue`, cada imagem da descrição vira um marcador `[image n]` no texto e é listada em `images`.
`plane_get_issue_images` as salva na mesma ordem, como `image-<n>.<ext>`, para que o agente as abra com a
ferramenta de leitura de arquivos. Ele detecta o tipo pela assinatura do arquivo e limita cada arquivo a 20 MB.
Uma imagem que falha ou é externa não impede as outras.

No Plane 1.4.2, o download de asset documentado (`GET /workspaces/<ws>/assets/<id>/`) responde 500. Por isso o
servidor chama `client.workItems.attachments.download`, que lê o redirecionamento do detalhe do anexo e segue a
URL assinada sem enviar a chave de API.

## Limites de taxa e cache

O Plane permite 60 requisições por minuto. Num `429`, o servidor espera o `Retry-After` uma vez (60 s no máximo)
e tenta de novo. Projetos, estados, labels, membros e o usuário atual ficam em cache por cinco minutos,
compartilhados por toda requisição que o processo atende.
