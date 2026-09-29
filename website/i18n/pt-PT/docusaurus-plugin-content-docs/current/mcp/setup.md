---
sidebar_position: 2
title: Configuração inicial
description: "Guarde as suas definições uma vez e registe o servidor MCP do Plane no Claude Code, no Codex e no OpenCode."
---

# Configuração inicial

## A forma rápida

Guarde as suas definições uma vez, e deixe a CLI registar o servidor nos clientes que encontrar:

```bash
npx plane mcp config    # pede a chave de API, o URL da instância, um workspace predefinido e uma porta
npx plane mcp install   # encontra o Claude Code, o Codex e o OpenCode no PATH e regista o plane-mcp (stdio)
```

`install` mostra uma lista de verificação dos clientes encontrados. Assinale os que quiser, e ele regista o
servidor através da CLI de cada cliente, com o nome `plane`. O comando registado lê a configuração guardada
quando o cliente o inicia, pelo que nenhuma chave de API acaba na configuração do cliente. Veja
[`plane mcp install`](../cli/mcp-commands.md#plane-mcp-install) para as flags.

## À mão: stdio

Deixe o cliente iniciar o `plane-mcp`. Lê a configuração guardada, pelo que a configuração do cliente não
precisa de chaves:

```json
{
  "mcpServers": {
    "plane": { "command": "npx", "args": ["-y", "-p", "@hoyasumii/plane", "plane-mcp"] }
  }
}
```

No Claude Code:

```bash
claude mcp add plane -- npx -y -p @hoyasumii/plane plane-mcp
```

Sem uma configuração guardada, ou para a substituir, dê ao cliente um bloco `env` com `PLANE_API_KEY`,
`PLANE_BASE_URL` e `PLANE_WORKSPACE`:

```json
{
  "mcpServers": {
    "plane": {
      "command": "npx",
      "args": ["-y", "-p", "@hoyasumii/plane", "plane-mcp"],
      "env": { "PLANE_API_KEY": "your-api-key", "PLANE_WORKSPACE": "acme" }
    }
  }
}
```

## À mão: HTTP

Corra um servidor em segundo plano e aponte os seus clientes para o respetivo URL:

```bash
npx plane mcp start          # mostra o URL, http://127.0.0.1:3766/mcp por predefinição
claude mcp add --transport http plane http://127.0.0.1:3766/mcp
```

Sem a CLI: `PORT=3766 PLANE_BASE_URL=... PLANE_API_KEY=... npx plane-mcp --http` corre em primeiro plano.
`plane-mcp --help` lista as flags. Para iniciar o servidor em cada login, corra `npx plane mcp boot enable`
(veja [`plane mcp boot`](../cli/mcp-commands.md#plane-mcp-boot)).

## A verificar se funciona

Peça ao seu agente para chamar `plane_whoami`, ou corra no terminal:

```bash
npx plane whoami
```

Responde com o utilizador da chave, o workspace predefinido, o URL base e a API que a instância serve.
