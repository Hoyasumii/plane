---
sidebar_position: 2
title: plane mcp
description: "plane mcp: guarde a configuração, execute o servidor em segundo plano, inicie-o no arranque da sessão e registe-o nos seus clientes MCP."
---

# `plane mcp`

`plane mcp` gere o servidor MCP por si: a respetiva configuração guardada, um servidor HTTP em segundo plano, um
serviço de login e o registo nos seus clientes MCP.

```bash
npx plane mcp config                 # pede as definições no terminal e guarda-as
npx plane mcp config --workspace acme --port 4000   # sem perguntas (scripts, CI): guarda só estas, mantém o resto
npx plane mcp config --web           # o mesmo, num formulário web local
npx plane mcp install                # escolha Claude Code / Codex / OpenCode e registe o plane-mcp (stdio) neles
npx plane mcp install --client claude,opencode --force   # sem seletor (scripts, CI); --force substitui uma entrada
npx plane mcp uninstall              # escolha os clientes de onde remover a entrada 'plane' (não é preciso configuração guardada)
npx plane mcp start                  # inicia em segundo plano (precisa de configuração guardada); mostra o URL para o `claude mcp add`
npx plane mcp start --api-key other --port 4000   # valores pontuais, nunca guardados
npx plane mcp status                 # em execução ou parado (saída 3), URL, pid, tempo de atividade
npx plane mcp stop
npx plane mcp boot enable            # inicia em cada login; `boot disable` / `boot status`
```

## `plane mcp config`

Escreve o `.env` guardado ([Configuração](../mcp/configuration.md)). Funciona de três formas:

- **No terminal** (a predefinição). Pede cada definição de cada vez, partindo dos valores guardados. A chave é
  introduzida mascarada, e Enter mantém a guardada. Nas outras definições, limpe a linha (Ctrl+U) para voltar à
  predefinição.
- **Com flags.** Com qualquer uma de `--api-key`, `--base-url`, `--workspace` ou `--port`, não pergunta nada e
  guarda só essas (`--workspace=` limpa uma). Sem terminal, são obrigatórias. Uma chave passada como flag fica no
  histórico da shell, por isso prefira o prompt para essa.
- **Num formulário web** com `--web`: uma página local, aberta no navegador (`--no-open` só mostra o URL).

Se houver um servidor em execução, é avisado para reiniciar e captar as alterações. `--config <ficheiro>` (ou
`PLANE_CONFIG`) escreve outro ficheiro.

## `plane mcp install`

Deteta cada cliente ao correr o respetivo `--version`, e regista o servidor stdio através da CLI do próprio
cliente, com o nome `plane`:

| Cliente     | Comando que executa         |
| ----------- | --------------------------- |
| Claude Code | `claude mcp add -s user`    |
| Codex       | `codex mcp add`             |
| OpenCode    | `opencode mcp add --global` |

O comando registado é `node <pacote>/dist/mcp/cli.js` por caminho absoluto, sem chave de API: o servidor lê o
ficheiro guardado quando o cliente o inicia (`PLANE_CONFIG` só é passado quando `--config` aponta para outro
ficheiro).

Todos os clientes encontrados começam marcados. Um que já tenha uma entrada `plane` aparece como
`already installed, reinstalls` e tem a entrada substituída. Sem terminal interativo, `--client` é obrigatório
(`claude`, `codex`, `opencode`; dentro do WSL também `claude@windows`, `codex@windows`, `opencode@windows`), mais
`--force` para substituir uma entrada. `--dry-run` mostra os comandos em vez de os executar.

`install` e `uninstall` funcionam sobre a configuração de nível de utilizador (global) de cada cliente. As
entradas ao nível do projeto nunca são tocadas.

## `plane mcp uninstall`

Lista os clientes com uma entrada `plane`, mostrando se é `stdio` ou `http`, e remove qualquer entrada com esse
nome: `claude mcp remove -s user`, `codex mcp remove` e, no OpenCode (que não tem `remove`), uma edição do
respetivo ficheiro de configuração global que apaga só essa chave, mantendo comentários e formatação.

É o único comando, além do `plane mcp config`, que corre sem configuração guardada, para que um cliente possa ser
limpo depois de a configuração deixar de existir. `--client` e `--dry-run` funcionam como em `install`.

## `plane mcp start`, `stop` e `status`

`start` corre o servidor HTTP destacado e mostra o URL, o ficheiro de registo e a linha `claude mcp add` para o
registar. Precisa de uma configuração guardada. `--api-key`, `--base-url`, `--workspace` e `--port` substituem-na
só nesta execução, e nunca são guardados. `--foreground` serve no processo atual.

`status` mostra se o servidor está em execução, com o URL, o pid e o tempo de atividade, e sai com o código 3
quando não está. `stop` pede ao servidor que se desligue através de um `POST /shutdown` protegido por token, e só
sinaliza o processo se isso falhar.

## `plane mcp boot`

`boot enable` instala um serviço do utilizador atual que inicia o servidor em cada login, pelo que não é preciso
sudo:

| SO      | Serviço                                                                        |
| ------- | ------------------------------------------------------------------------------ |
| Linux   | uma unit de utilizador do systemd (no WSL, ative o systemd em `/etc/wsl.conf`) |
| macOS   | um LaunchAgent                                                                 |
| Windows | uma tarefa de logon                                                            |

O serviço lê apenas a configuração guardada. `boot disable` remove-o e `boot status` reporta o respetivo estado.
