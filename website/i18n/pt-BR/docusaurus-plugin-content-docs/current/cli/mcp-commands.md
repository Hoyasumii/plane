---
sidebar_position: 2
title: plane mcp
---

# `plane mcp`

`plane mcp` gerencia o servidor MCP para você: a configuração salva, um servidor HTTP em segundo plano, um
serviço de login e o registro nos seus clientes MCP.

```bash
npx plane mcp config                 # pede as configurações no terminal e as salva
npx plane mcp config --workspace acme --port 4000   # sem perguntas (scripts, CI): salva só estas, mantém o resto
npx plane mcp config --web           # o mesmo, num formulário web local
npx plane mcp install                # escolha Claude Code / Codex / OpenCode e registre o plane-mcp (stdio) neles
npx plane mcp install --client claude,opencode --force   # sem seletor (scripts, CI); --force substitui uma entrada
npx plane mcp uninstall              # escolha os clientes de onde remover a entrada 'plane' (não precisa de config salva)
npx plane mcp start                  # inicia em segundo plano (precisa de config salva); mostra a URL para o `claude mcp add`
npx plane mcp start --api-key other --port 4000   # valores avulsos, nunca salvos
npx plane mcp status                 # rodando ou parado (saída 3), URL, pid, tempo no ar
npx plane mcp stop
npx plane mcp boot enable            # inicia a cada login; `boot disable` / `boot status`
```

## `plane mcp config`

Escreve o `.env` salvo ([Configurações](../mcp/configuration.md)). Funciona de três jeitos:

- **No terminal** (o padrão). Pede cada configuração por vez, partindo dos valores salvos. A chave é digitada
  mascarada, e Enter mantém a salva. Nas outras configurações, limpe a linha (Ctrl+U) para voltar ao padrão.
- **Com flags.** Com qualquer uma de `--api-key`, `--base-url`, `--workspace` ou `--port`, ele não pergunta nada
  e salva só essas (`--workspace=` limpa uma). Sem terminal, elas são obrigatórias. Uma chave passada como flag
  fica no histórico do shell, então prefira o prompt para ela.
- **Num formulário web** com `--web`: uma página local, aberta no navegador (`--no-open` só mostra a URL).

Se houver um servidor rodando, ele é avisado para reiniciar e pegar as mudanças. `--config <arquivo>` (ou
`PLANE_CONFIG`) escreve outro arquivo.

## `plane mcp install`

Detecta cada cliente rodando o `--version` dele e registra o servidor stdio pela CLI do próprio cliente, com o nome
`plane`:

| Cliente     | Comando que ele roda        |
| ----------- | --------------------------- |
| Claude Code | `claude mcp add -s user`    |
| Codex       | `codex mcp add`             |
| OpenCode    | `opencode mcp add --global` |

O comando registrado é `node <pacote>/dist/mcp/cli.js` por caminho absoluto, sem chave de API: o servidor lê o
arquivo salvo quando o cliente o inicia (`PLANE_CONFIG` só é passado quando `--config` aponta para outro
arquivo).

Todo cliente encontrado começa marcado. Um que já tem uma entrada `plane` aparece como
`already installed, reinstalls` e tem a entrada substituída. Sem terminal interativo, `--client` é obrigatório
(`claude`, `codex`, `opencode`; dentro do WSL também `claude@windows`, `codex@windows`, `opencode@windows`), mais
`--force` para substituir uma entrada. `--dry-run` mostra os comandos em vez de executá-los.

`install` e `uninstall` trabalham na configuração de nível de usuário (global) de cada cliente. Entradas de escopo
de projeto nunca são tocadas.

## `plane mcp uninstall`

Lista os clientes com uma entrada `plane`, mostrando se ela é `stdio` ou `http`, e remove qualquer entrada com
esse nome: `claude mcp remove -s user`, `codex mcp remove` e, no OpenCode (que não tem `remove`), uma edição do
arquivo de configuração global que apaga só essa chave, mantendo comentários e formatação.

É o único comando além do `plane mcp config` que roda sem configuração salva, para que um cliente possa ser limpo
depois que a configuração já não existe. `--client` e `--dry-run` funcionam como no `install`.

## `plane mcp start`, `stop` e `status`

`start` roda o servidor HTTP destacado e mostra a URL, o arquivo de log e a linha `claude mcp add` para
registrá-lo. Precisa de uma configuração salva. `--api-key`, `--base-url`, `--workspace` e `--port` a sobrescrevem
só nessa execução e nunca são salvos. `--foreground` serve no processo atual.

`status` mostra se o servidor está rodando, com URL, pid e tempo no ar, e sai com código 3 quando não está. `stop`
pede ao servidor que desligue por um `POST /shutdown` protegido por token, e só sinaliza o processo se isso falhar.

## `plane mcp boot`

`boot enable` instala um serviço do usuário atual que inicia o servidor a cada login, então não precisa de sudo:

| SO      | Serviço                                                                     |
| ------- | --------------------------------------------------------------------------- |
| Linux   | uma unit de usuário do systemd (no WSL, ative o systemd em `/etc/wsl.conf`) |
| macOS   | um LaunchAgent                                                              |
| Windows | uma tarefa de logon                                                         |

O serviço lê só a configuração salva. `boot disable` o remove e `boot status` informa o estado dele.
