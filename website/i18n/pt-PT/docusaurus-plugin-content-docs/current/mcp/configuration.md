---
sidebar_position: 6
title: Configuração
description: "As quatro definições que o servidor MCP, o bin plane-mcp e a CLI plane partilham, onde ficam guardadas e qual prevalece."
---

# Configuração

O servidor, o binário `plane-mcp` e a CLI `plane` leem as mesmas quatro definições:

| Definição         | Flag          | Predefinição           | Significado                                                                   |
| ----------------- | ------------- | ---------------------- | ----------------------------------------------------------------------------- |
| `PLANE_API_KEY`   | `--api-key`   | nenhuma (obrigatória)  | a chave de API do Plane, enviada como `X-Api-Key`                             |
| `PLANE_BASE_URL`  | `--base-url`  | `https://api.plane.so` | a instância do Plane: o Plane Cloud ou o URL da sua instância self-hosted     |
| `PLANE_WORKSPACE` | `--workspace` | nenhum                 | um workspace predefinido: com ele, o `slug` de qualquer ferramenta é opcional |
| `PORT`            | `--port`      | `3766`                 | a porta do servidor HTTP em `127.0.0.1`                                       |

Cada uma é obtida pela primeira destas fontes: uma flag, o ambiente, o ficheiro guardado, a predefinição. A
resolução está em `resolveMcpConfig` (`src/mcp/config.ts`).

## O ficheiro guardado

`plane mcp config` guarda as definições num `.env` por utilizador:

| SO      | Caminho                                                |
| ------- | ------------------------------------------------------ |
| Linux   | `~/.config/plane/.env` (respeitando `XDG_CONFIG_HOME`) |
| macOS   | `~/Library/Application Support/plane/.env`             |
| Windows | `%APPDATA%\plane\.env`                                 |

`PLANE_CONFIG` (ou `--config`) aponta para outro ficheiro. O ficheiro de pid e o registo do servidor em segundo
plano ficam numa pasta `run/` ao lado dele.

```text
PLANE_API_KEY=plane_api_0123456789abcdef
PLANE_BASE_URL=https://plane.example.com
PLANE_WORKSPACE=acme
PORT=3766
```

Todo o comando `plane`, exceto `plane mcp config` e `plane mcp uninstall`, recusa-se a correr até esse ficheiro
ter uma chave de API. As flags e as variáveis de ambiente substituem então os valores guardados só nessa
execução. O `plane-mcp` e o `plane <ferramenta>` em processo também leem o ficheiro guardado.

Veja [`plane mcp config`](../cli/mcp-commands.md#plane-mcp-config) para as três formas de o escrever.

## A partir do código

A mesma resolução é exportada, para ferramentas que queiram reaproveitar a configuração guardada:

```ts
import { configFilePath, readEnvFile, resolveMcpConfig, startPlaneMcpServer } from "@hoyasumii/plane/mcp";

const config = resolveMcpConfig({ env: process.env, file: readEnvFile(configFilePath()) });
if (!config.apiKey) throw new Error("run `plane mcp config` first");

const server = await startPlaneMcpServer(config);
console.log(server.url);
```
