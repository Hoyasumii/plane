---
sidebar_position: 1
title: Visão geral da CLI
---

# CLI

O pacote instala um comando `plane`. Ele é um cliente MCP do [mesmo servidor](../mcp/overview.md): cada
ferramenta MCP vira um subcomando, e o schema de entrada da ferramenta vira as flags dele. Por padrão, o servidor
roda dentro do próprio comando, então não há nada para iniciar antes.

```bash
npx plane mcp config                 # uma vez: salva a chave de API (PLANE_BASE_URL tem padrão https://api.plane.so)
npx plane tools                      # todos os comandos, um por ferramenta MCP
npx plane whoami
npx plane get-issue --key ACME-14
npx plane list-my-issues --project ACME
npx plane list-work-items --slug acme --project ENG --per-page 20 --fields name,state_id
npx plane get-work-item --slug acme --work-item ENG-123
npx plane resources --query cycle
npx plane describe --resource workspaces.projects.cycles --method delete
npx plane call --resource workspaces.projects.cycles --method delete \
  --args '{"slug":"acme","project":"ENG","cycle":"<cycle-id>"}' --confirm
```

Nada além de `--help`, `--version` e `plane docs` roda até que o `plane mcp config` tenha salvo uma configuração
com chave de API. O `plane docs` imprime o link deste site e o abre no navegador.

## De ferramentas a comandos

- O comando é o nome da ferramenta sem `plane_`, em kebab-case: `plane_list_work_items` → `list-work-items`.
- Cada flag é uma entrada em kebab-case: `per_page` → `--per-page`, `workItem` → `--work-item`.
- Flags de array aceitam `a,b` ou JSON, flags de objeto aceitam JSON, e flags booleanas não precisam de valor.
- `plane <comando> --help` lista as flags de um comando, com os valores permitidos das entradas enumeradas.

A saída da ferramenta vai para o stdout. Um erro da ferramenta vai para o stderr, com código de saída 1.

## Falando com um servidor em execução

Para usar um `plane-mcp` que já está rodando em HTTP em vez do servidor em processo, passe
`--url http://127.0.0.1:3766/mcp` ou defina `PLANE_MCP_URL`. `--base-url` e `--api-key` sobrescrevem o ambiente e
o arquivo salvo para o servidor em processo.

Nenhuma dessas flags substitui a configuração salva: a CLI se recusa a rodar ferramentas sem ela, mesmo com
`--url` ou `--api-key`.

## Gerenciando o servidor

`plane mcp` é interceptado antes de qualquer conexão. Ele configura o servidor, roda-o em segundo plano, inicia-o
no login e o registra nos seus clientes MCP. Veja [`plane mcp`](./mcp-commands.md).
