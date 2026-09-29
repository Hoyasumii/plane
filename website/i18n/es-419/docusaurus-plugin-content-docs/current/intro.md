---
sidebar_position: 1
title: Primeros pasos
description: "Un SDK de TypeScript para la API de Plane, con un servidor MCP y una CLI construidos sobre él: qué hace cada parte y cómo instalarlo."
slug: /intro
---

# Primeros pasos

`@hoyasumii/plane` es un SDK de TypeScript para la API de [Plane](https://plane.so), con un servidor MCP y una CLI
construidos sobre él. Úsalo desde el código, desde un agente de IA o desde tu terminal: los tres comparten el
mismo cliente.

- **SDK**: un cliente tipado para la API v1 y toda la superficie v2 (`client.v2`, 90 recursos). `fields` restringe
  el tipo de retorno en tiempo de compilación, y las filas obtenidas se pueden navegar hasta sus hijos.
  Empieza por [API v2](./sdk/v2/overview.md).
- **Servidor MCP** (`@hoyasumii/plane/mcp`): stdio o Streamable HTTP. Tiene herramientas de tarea que funcionan
  con claves y nombres (`ACME-130`, `"Todo"`, `"me"`) y herramientas genéricas que alcanzan todos los métodos v2.
  Empieza por [servidor MCP](./mcp/overview.md).
- **CLI** (`plane`): cada herramienta MCP como un subcomando, más `plane mcp` para configurar el servidor,
  ejecutarlo en segundo plano, iniciarlo al iniciar sesión y registrarlo en Claude Code, Codex y OpenCode.
  Empieza por [CLI](./cli/overview.md).

Funciona con Plane Cloud y con instancias self-hosted, incluida la 1.4.x self-hosted, que no tiene API v2.

## Instalación

Requiere Node.js 20 o una versión posterior.

```bash
npm install @hoyasumii/plane
# o
pnpm add @hoyasumii/plane
```

## Inicio rápido

Crea un cliente con una clave de API (Plane → configuración del workspace → API tokens), o con un token de acceso
OAuth. `baseUrl` usa Plane Cloud por defecto (`https://api.plane.so`); apúntalo a tu propia instancia si eres
self-hosted.

```ts
import { PlaneClient } from "@hoyasumii/plane";

const client = new PlaneClient({ apiKey: "your-api-key" });

// API v2: los ids de la ruta son posicionales y van primero, en el orden de la URL.
const states = await client.v2.workspaces.projects.states.list("acme", "ENG");

// Una fila obtenida lleva sus ids, así que sus hijos no necesitan ninguno.
const eng = await client.v2.workspaces.projects.retrieve("acme", "ENG");
await eng.workItems.create({ name: "Fix login bug", state: "Todo", labels: ["bug"] });

// La API v1 también está en el cliente.
const projects = await client.projects.list("acme");
```

## Usándolo desde un agente de IA

Guarda tu configuración una vez y registra el servidor MCP en los clientes instalados en tu máquina:

```bash
npx plane mcp config    # pide la clave de API, la URL de la instancia y un workspace por defecto
npx plane mcp install   # registra plane-mcp en Claude Code, Codex y OpenCode
```

[Configuración inicial del MCP](./mcp/setup.md) cubre la configuración manual y el transporte HTTP.

## Usándolo desde la terminal

Después de `plane mcp config`, cada herramienta MCP es un comando:

```bash
npx plane whoami
npx plane list-my-issues
npx plane get-issue --key ACME-14
```

Consulta [CLI](./cli/overview.md).
