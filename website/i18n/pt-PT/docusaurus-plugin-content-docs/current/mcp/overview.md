---
sidebar_position: 1
title: Visão geral do servidor MCP
description: "O servidor MCP do Plane: o Plane para o Claude Code, o Codex, o OpenCode, o Claude Desktop e qualquer outro cliente MCP."
---

# Servidor MCP

`@hoyasumii/plane/mcp` transforma o SDK num servidor [MCP](https://modelcontextprotocol.io), para que o Claude
Code, o Codex, o OpenCode, o Claude Desktop ou qualquer outro cliente MCP possa trabalhar com o Plane.

## Dois transportes

| Transporte               | Quem executa o servidor                                           | Como o iniciar                                               |
| ------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------ |
| **stdio** (predefinição) | o cliente MCP inicia o `plane-mcp` e é o proprietário do processo | `plane mcp install`, ou registe o `plane-mcp` manualmente    |
| **Streamable HTTP**      | um servidor de longa duração partilhado por vários clientes       | `plane mcp start`, `plane-mcp --http`, ou a partir do código |

No modo stdio, o servidor começa com o cliente e termina quando o cliente fecha o stdin. O stdout transporta o
protocolo, pelo que o servidor só escreve registos no stderr. No modo HTTP, escuta apenas em `127.0.0.1`, sem
estado, sobre Streamable HTTP (`POST /mcp`), e a respetiva cache é partilhada por todos os clientes que se
ligam.

## Três tipos de ferramentas

- **[Ferramentas de tarefas](./task-tools.md)** (`plane_get_issue`, `plane_update_issue`, `plane_add_comment`,
  …) são o contrato estável em que se apoiam os fluxos de trabalho de agentes orientados a tarefas. Recebem
  tarefas pela chave (`ACME-130`) e projetos, estados, labels e membros pelo nome, e respondem com uma saída
  legível, sem ids. Usam sempre a API v1, que tanto o Plane Cloud como o self-hosted servem.
- **[Ferramentas de work item](./work-item-tools.md)** (`plane_list_work_items`, `plane_get_work_item`,
  `plane_create_work_item`, `plane_update_work_item`) usam a API v2, com os respetivos filtros, `fields` e
  `expand`.
- **[Ferramentas genéricas](./generic-tools.md)** (`plane_resources`, `plane_describe`, `plane_call`) alcançam
  todos os outros métodos v2, nos 90 recursos.

## Instâncias sem API v2

O Plane self-hosted 1.4.x responde 404 a qualquer rota `/api/v2`. O servidor descobre isso com um único
`GET /api/v2/users/me/`, na primeira vez que precisa, e guarda a resposta durante a vida do processo. Uma chave
inválida ou um erro de rede não são memorizados. Numa instância assim:

- As ferramentas de tarefas funcionam como habitualmente, já que usam a v1 de qualquer forma.
- As ferramentas `*_work_item` respondem através da v1, com as mesmas entradas. Os parâmetros que só a v2
  consegue servir (`cycle_id`, `module_id`, `order_by`, `fields`, `expand`, `type`, `estimate`) falham pelo
  nome.
- `plane_resources` e `plane_call` avisam que a v2 não está disponível e apontam para as ferramentas tipadas, em
  vez de reencaminhar um 404. `plane_describe` continua a funcionar, porque só lê o catálogo.

`plane_whoami` reporta qual a API que a instância serve (`v1` ou `v2`).

## Próximos passos

- [Configuração inicial](./setup.md): registe o servidor no seu cliente MCP.
- [Configuração](./configuration.md): as definições e onde ficam guardadas.
- [Utilização programática](./programmatic.md): inicie o servidor a partir do seu próprio código.
