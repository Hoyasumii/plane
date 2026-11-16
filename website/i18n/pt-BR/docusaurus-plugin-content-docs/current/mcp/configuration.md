---
sidebar_position: 6
title: Configurações
description: "As quatro configurações que o servidor MCP, o bin plane-mcp e a CLI plane compartilham, onde ficam salvas e qual prevalece."
---

# Configurações

O servidor, o bin `plane-mcp` e a CLI `plane` leem as mesmas quatro configurações:

| Configuração      | Flag          | Padrão                 | Significado                                                          |
| ----------------- | ------------- | ---------------------- | -------------------------------------------------------------------- |
| `PLANE_API_KEY`   | `--api-key`   | nenhum (obrigatória)   | a chave de API do Plane, enviada como `X-Api-Key`                    |
| `PLANE_BASE_URL`  | `--base-url`  | `https://api.plane.so` | a instância do Plane: o Plane Cloud ou a URL do seu self-hosted      |
| `PLANE_WORKSPACE` | `--workspace` | nenhum                 | um workspace padrão: com ele, o `slug` de toda ferramenta é opcional |
| `PORT`            | `--port`      | `3766`                 | a porta do servidor HTTP em `127.0.0.1`                              |

Cada uma vem da primeira fonte disponível: uma flag, o ambiente, o arquivo salvo, o padrão. A resolução fica em
`resolveMcpConfig` (`src/mcp/config.ts`).

## O arquivo salvo

`plane mcp config` salva as configurações num `.env` por usuário:

| SO      | Caminho                                                |
| ------- | ------------------------------------------------------ |
| Linux   | `~/.config/plane/.env` (respeitando `XDG_CONFIG_HOME`) |
| macOS   | `~/Library/Application Support/plane/.env`             |
| Windows | `%APPDATA%\plane\.env`                                 |

`PLANE_CONFIG` (ou `--config`) aponta para outro arquivo. O arquivo de pid e o log do servidor em segundo plano
ficam numa pasta `run/` ao lado dele.

```text
PLANE_API_KEY=plane_api_0123456789abcdef
PLANE_BASE_URL=https://plane.example.com
PLANE_WORKSPACE=acme
PORT=3766
```

Todo comando `plane`, exceto `plane mcp config` e `plane mcp uninstall`, se recusa a rodar até que esse arquivo
tenha uma chave de API. Flags e variáveis de ambiente então sobrescrevem os valores salvos só naquela execução. O
`plane-mcp` e o `plane <ferramenta>` em processo também leem o arquivo salvo.

Veja [`plane mcp config`](../cli/mcp-commands.md#plane-mcp-config) para as três formas de escrevê-lo.

## Atrás do Cloudflare Access

Quando a instância do Plane fica atrás do [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/),
a API responde com a página de login do Access e a chave de API nem chega ao Plane. Acrescente uma linha ao arquivo salvo:

```text
PLANE_CF_ACCESS=cloudflared
```

Com ela, toda requisição leva também `cf-access-token`, obtido com `cloudflared access token -app=<PLANE_BASE_URL>`
para o usuário logado no Access. Instale o [`cloudflared`](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)
e faça login uma vez (e de novo sempre que a sessão do Access expirar):

```bash
cloudflared access login https://plane.example.com
```

O token é reaproveitado até pouco antes de expirar. Login ausente, login expirado ou a própria página de login
falham com um `CloudflareAccessError` que diz qual comando rodar. O `plane mcp config` não pergunta por essa
configuração, mas a mantém ao salvar. No código, passe `headers: cloudflaredAccessHeaders(baseUrl)` ao `PlaneClient`.

## A partir do código

A mesma resolução é exportada, para ferramentas que queiram reaproveitar a configuração salva:

```ts
import { configFilePath, readEnvFile, resolveMcpConfig, startPlaneMcpServer } from "@hoyasumii/plane/mcp";

const config = resolveMcpConfig({ env: process.env, file: readEnvFile(configFilePath()) });
if (!config.apiKey) throw new Error("rode `plane mcp config` antes");

const server = await startPlaneMcpServer(config);
console.log(server.url);
```
