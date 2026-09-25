---
sidebar_position: 1
title: Primeiros passos
slug: /intro
---

# Primeiros passos

`@hoyasumii/plane` é um SDK TypeScript para a API do [Plane](https://plane.so), com um servidor MCP e uma CLI
construídos sobre ele. Use-o no código, a partir de um agente de IA ou no terminal: os três compartilham o
mesmo cliente.

- **SDK**: um cliente tipado para a API v1 e para toda a superfície v2 (`client.v2`, 90 recursos). `fields`
  restringe o tipo de retorno em tempo de compilação, e as linhas buscadas navegam até seus filhos.
  Comece pela [API v2](./sdk/v2/overview.md).
- **Servidor MCP** (`@hoyasumii/plane/mcp`): stdio ou Streamable HTTP. Tem ferramentas de tarefa que trabalham
  com chaves e nomes (`ACME-130`, `"Todo"`, `"me"`) e ferramentas genéricas que alcançam todo método v2.
  Comece pelo [servidor MCP](./mcp/overview.md).
- **CLI** (`plane`): cada ferramenta MCP como subcomando, mais `plane mcp` para configurar o servidor, rodá-lo em
  segundo plano, iniciá-lo no login e registrá-lo no Claude Code, no Codex e no OpenCode.
  Comece pela [CLI](./cli/overview.md).

Funciona com o Plane Cloud e com instâncias self-hosted, inclusive a 1.4.x, que não tem API v2.

## Instalação

Requer Node.js 20 ou mais recente.

```bash
npm install @hoyasumii/plane
# ou
pnpm add @hoyasumii/plane
```

## Início rápido

Crie um cliente com uma chave de API (Plane → configurações do workspace → API tokens) ou com um access token
OAuth. `baseUrl` aponta por padrão para o Plane Cloud (`https://api.plane.so`); troque pela URL da sua instância
se for self-hosted.

```ts
import { PlaneClient } from "@hoyasumii/plane";

const client = new PlaneClient({ apiKey: "your-api-key" });

// API v2: os ids do caminho são posicionais e vêm primeiro, na ordem da URL.
const states = await client.v2.workspaces.projects.states.list("acme", "ENG");

// Uma linha buscada carrega seus ids, então os filhos dela não precisam de nenhum.
const eng = await client.v2.workspaces.projects.retrieve("acme", "ENG");
await eng.workItems.create({ name: "Fix login bug", state: "Todo", labels: ["bug"] });

// A API v1 também está no cliente.
const projects = await client.projects.list("acme");
```

## Usando a partir de um agente de IA

Salve suas configurações uma vez e registre o servidor MCP nos clientes instalados na sua máquina:

```bash
npx plane mcp config    # pede a chave de API, a URL da instância e um workspace padrão
npx plane mcp install   # registra o plane-mcp no Claude Code, no Codex e no OpenCode
```

A página [Configuração do MCP](./mcp/setup.md) cobre a configuração manual e o transporte HTTP.

## Usando no terminal

Depois do `plane mcp config`, cada ferramenta MCP vira um comando:

```bash
npx plane whoami
npx plane list-my-issues
npx plane get-issue --key ACME-14
```

Veja [CLI](./cli/overview.md).
