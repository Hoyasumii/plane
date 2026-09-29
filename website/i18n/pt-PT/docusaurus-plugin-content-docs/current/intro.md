---
sidebar_position: 1
title: Primeiros passos
description: "Um SDK TypeScript para a API do Plane, com um servidor MCP e uma CLI construídos sobre ele: o que faz cada parte e como o instalar."
slug: /intro
---

# Primeiros passos

`@hoyasumii/plane` é um SDK TypeScript para a API do [Plane](https://plane.so), com um servidor MCP e uma CLI
construídos sobre ele. Use-o no código, a partir de um agente de IA ou no terminal: os três partilham o
mesmo cliente.

- **SDK**: um cliente tipado para a API v1 e para toda a superfície v2 (`client.v2`, 90 recursos). `fields`
  restringe o tipo de retorno em tempo de compilação, e as linhas obtidas podem ser navegadas até aos respetivos filhos.
  Comece pela [API v2](./sdk/v2/overview.md).
- **Servidor MCP** (`@hoyasumii/plane/mcp`): stdio ou Streamable HTTP. Tem ferramentas de tarefas que funcionam
  com chaves e nomes (`ACME-130`, `"Todo"`, `"me"`) e ferramentas genéricas que alcançam todos os métodos v2.
  Comece pelo [servidor MCP](./mcp/overview.md).
- **CLI** (`plane`): cada ferramenta MCP como subcomando, mais `plane mcp` para configurar o servidor, corrê-lo em
  segundo plano, iniciá-lo no login e registá-lo no Claude Code, no Codex e no OpenCode.
  Comece pela [CLI](./cli/overview.md).

Funciona com o Plane Cloud e com instâncias self-hosted, incluindo a 1.4.x, que não tem API v2.

## Instalação

Requer Node.js 20 ou mais recente.

```bash
npm install @hoyasumii/plane
# ou
pnpm add @hoyasumii/plane
```

## Início rápido

Crie um cliente com uma chave de API (Plane → definições do workspace → API tokens) ou com um token de acesso
OAuth. Por predefinição, `baseUrl` aponta para o Plane Cloud (`https://api.plane.so`); aponte-o para o URL da
sua instância quando estiver a usar self-hosting.

```ts
import { PlaneClient } from "@hoyasumii/plane";

const client = new PlaneClient({ apiKey: "your-api-key" });

// API v2: os ids do caminho são posicionais e vêm primeiro, na ordem do URL.
const states = await client.v2.workspaces.projects.states.list("acme", "ENG");

// Uma linha obtida carrega os seus ids, pelo que os filhos não precisam de nenhum.
const eng = await client.v2.workspaces.projects.retrieve("acme", "ENG");
await eng.workItems.create({ name: "Fix login bug", state: "Todo", labels: ["bug"] });

// A API v1 também está disponível no cliente.
const projects = await client.projects.list("acme");
```

## A usar a partir de um agente de IA

Guarde as suas definições uma vez e registe o servidor MCP nos clientes instalados na sua máquina:

```bash
npx plane mcp config    # pede a chave de API, o URL da instância e um workspace predefinido
npx plane mcp install   # regista o plane-mcp no Claude Code, no Codex e no OpenCode
```

A página [Configuração do MCP](./mcp/setup.md) aborda a configuração manual e o transporte HTTP.

## A usar a partir do terminal

Depois de `plane mcp config`, cada ferramenta MCP torna-se um comando:

```bash
npx plane whoami
npx plane list-my-issues
npx plane get-issue --key ACME-14
```

Veja [CLI](./cli/overview.md).
