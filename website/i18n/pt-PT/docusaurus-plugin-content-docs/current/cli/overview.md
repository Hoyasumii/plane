---
sidebar_position: 1
title: Visão geral da CLI
description: "O comando plane: cada ferramenta MCP como um subcomando, com o schema de entrada da ferramenta como flags."
---

# CLI

O pacote instala um comando `plane`. É um cliente MCP do [mesmo servidor](../mcp/overview.md): cada
ferramenta MCP torna-se um subcomando, e o schema de entrada da ferramenta torna-se as respetivas flags. Por
predefinição, o servidor corre dentro do próprio comando, pelo que não há nada para iniciar antes.

```bash
npx plane mcp config                 # uma vez: guarda a chave de API (PLANE_BASE_URL usa https://api.plane.so por predefinição)
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

Nada além de `--help`, `--version` e `plane docs` corre até que o `plane mcp config` tenha guardado uma
configuração com chave de API. O `plane docs` imprime o link para este site e abre-o no navegador.

## De ferramentas a comandos

- O comando é o nome da ferramenta sem `plane_`, em kebab-case: `plane_list_work_items` → `list-work-items`.
- Cada flag é uma entrada em kebab-case: `per_page` → `--per-page`, `workItem` → `--work-item`.
- As flags de array aceitam `a,b` ou JSON, as flags de objeto aceitam JSON, e as flags booleanas não precisam de valor.
- `plane <comando> --help` lista as flags de um comando, com os valores permitidos das entradas enumeradas.

A saída da ferramenta vai para o stdout. Um erro da ferramenta vai para o stderr, com código de saída 1.

## A falar com um servidor em execução

Para usar um `plane-mcp` que já está a correr em HTTP em vez do servidor em processo, passe
`--url http://127.0.0.1:3766/mcp` ou defina `PLANE_MCP_URL`. `--base-url` e `--api-key` substituem o ambiente e
o ficheiro guardado para o servidor em processo.

Nenhuma destas flags substitui a configuração guardada: a CLI recusa-se a correr ferramentas sem ela, mesmo com
`--url` ou `--api-key`.

## A gerir o servidor

`plane mcp` é intercetado antes de qualquer ligação. Configura o servidor, corre-o em segundo plano, inicia-o
no login e regista-o nos seus clientes MCP. Veja [`plane mcp`](./mcp-commands.md).
