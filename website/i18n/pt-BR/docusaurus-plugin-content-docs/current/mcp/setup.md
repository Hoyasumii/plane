---
sidebar_position: 2
title: Configuração inicial
---

# Configuração inicial

## O jeito rápido

Salve suas configurações uma vez e deixe a CLI registrar o servidor nos clientes que ela encontrar:

```bash
npx plane mcp config    # pede a chave de API, a URL da instância, um workspace padrão e uma porta
npx plane mcp install   # acha o Claude Code, o Codex e o OpenCode no PATH e registra o plane-mcp (stdio)
```

`install` mostra uma lista dos clientes encontrados. Marque os que quiser, e ele registra o servidor pela CLI de
cada cliente, com o nome `plane`. O comando registrado lê a configuração salva quando o cliente o inicia, então
nenhuma chave de API vai parar na configuração do cliente. Veja
[`plane mcp install`](../cli/mcp-commands.md#plane-mcp-install) para as flags.

## À mão: stdio

Deixe o cliente iniciar o `plane-mcp`. Ele lê a configuração salva, então a configuração do cliente não precisa
de chaves:

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

Sem uma configuração salva, ou para sobrescrevê-la, dê ao cliente um bloco `env` com `PLANE_API_KEY`,
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

Rode um servidor em segundo plano e aponte seus clientes para a URL dele:

```bash
npx plane mcp start          # mostra a URL, http://127.0.0.1:3766/mcp por padrão
claude mcp add --transport http plane http://127.0.0.1:3766/mcp
```

Sem a CLI: `PORT=3766 PLANE_BASE_URL=... PLANE_API_KEY=... npx plane-mcp --http` roda em primeiro plano.
`plane-mcp --help` lista as flags. Para iniciar o servidor a cada login, rode `npx plane mcp boot enable` (veja
[`plane mcp boot`](../cli/mcp-commands.md#plane-mcp-boot)).

## Conferindo se funciona

Peça ao seu agente para chamar `plane_whoami`, ou rode no terminal:

```bash
npx plane whoami
```

Ele responde o usuário da chave, o workspace padrão, a URL base e a API que a instância serve.
