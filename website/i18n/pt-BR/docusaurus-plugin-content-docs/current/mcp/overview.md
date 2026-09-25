---
sidebar_position: 1
title: Visão geral do servidor MCP
---

# Servidor MCP

`@hoyasumii/plane/mcp` transforma o SDK num servidor [MCP](https://modelcontextprotocol.io), para que o Claude
Code, o Codex, o OpenCode, o Claude Desktop ou qualquer outro cliente MCP trabalhe com o Plane.

## Dois transportes

| Transporte          | Quem roda o servidor                                           | Como iniciar                                                 |
| ------------------- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| **stdio** (padrão)  | o cliente MCP inicia o `plane-mcp` e é dono do processo        | `plane mcp install`, ou registre o `plane-mcp` à mão         |
| **Streamable HTTP** | um servidor de longa duração compartilhado por vários clientes | `plane mcp start`, `plane-mcp --http`, ou a partir do código |

No modo stdio o servidor começa com o cliente e termina quando o cliente fecha o stdin. O stdout carrega o
protocolo, então o servidor só escreve logs no stderr. No modo HTTP ele escuta apenas em `127.0.0.1`, sem estado,
sobre Streamable HTTP (`POST /mcp`), e o cache dele é compartilhado por todo cliente que se conecta.

## Três tipos de ferramenta

- **[Ferramentas de tarefa](./task-tools.md)** (`plane_get_issue`, `plane_update_issue`, `plane_add_comment`,
  …) são o contrato estável em que os fluxos de agentes baseados em tarefas se apoiam. Recebem tarefas pela chave
  (`ACME-130`) e projetos, estados, labels e membros pelo nome, e respondem uma saída legível, sem ids. Sempre
  usam a API v1, que o Plane Cloud e o self-hosted servem.
- **[Ferramentas de work item](./work-item-tools.md)** (`plane_list_work_items`, `plane_get_work_item`,
  `plane_create_work_item`, `plane_update_work_item`) usam a API v2, com os filtros, `fields` e `expand` dela.
- **[Ferramentas genéricas](./generic-tools.md)** (`plane_resources`, `plane_describe`, `plane_call`) alcançam
  todos os outros métodos v2, nos 90 recursos.

## Instâncias sem API v2

O Plane self-hosted 1.4.x responde 404 a toda rota `/api/v2`. O servidor descobre isso com um único
`GET /api/v2/users/me/` na primeira vez que precisa, e guarda a resposta enquanto o processo viver. Uma chave
inválida ou um erro de rede não são guardados. Numa instância assim:

- As ferramentas de tarefa funcionam normalmente, já que usam a v1 de qualquer forma.
- As ferramentas `*_work_item` respondem pela v1, com as mesmas entradas. Os parâmetros que só a v2 atende
  (`cycle_id`, `module_id`, `order_by`, `fields`, `expand`, `type`, `estimate`) falham com o próprio nome.
- `plane_resources` e `plane_call` avisam que a v2 não está disponível e apontam para as ferramentas tipadas, em
  vez de repassar um 404. `plane_describe` continua funcionando, porque só lê o catálogo.

`plane_whoami` informa qual API a instância serve (`v1` ou `v2`).

## Próximos passos

- [Configuração inicial](./setup.md): registre o servidor no seu cliente MCP.
- [Configurações](./configuration.md): as configurações e onde elas ficam salvas.
- [Uso programático](./programmatic.md): inicie o servidor a partir do seu código.
