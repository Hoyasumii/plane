---
sidebar_position: 1
title: Getting started
slug: /intro
---

# Getting started

`@hoyasumii/plane` is a TypeScript SDK for the [Plane](https://plane.so) API, with an MCP server and a CLI
built on top of it. Use it from code, from an AI agent, or from your terminal: all three share the same client.

- **SDK**: a typed client for API v1 and the whole v2 surface (`client.v2`, 90 resources). `fields` narrows
  the return type at compile time, and fetched rows can be navigated to their children.
  Start at [API v2](./sdk/v2/overview.md).
- **MCP server** (`@hoyasumii/plane/mcp`): stdio or Streamable HTTP. It has task tools that work with keys and
  names (`ACME-130`, `"Todo"`, `"me"`) and generic tools that reach every v2 method.
  Start at [MCP server](./mcp/overview.md).
- **CLI** (`plane`): every MCP tool as a subcommand, plus `plane mcp` to configure the server, run it in the
  background, start it at login and register it in Claude Code, Codex and OpenCode.
  Start at [CLI](./cli/overview.md).

It works with Plane Cloud and with self-hosted instances, including self-hosted 1.4.x, which has no API v2.

## Installation

Requires Node.js 20 or later.

```bash
npm install @hoyasumii/plane
# or
pnpm add @hoyasumii/plane
```

## Quick start

Create a client with an API key (Plane → workspace settings → API tokens), or with an OAuth access token.
`baseUrl` defaults to Plane Cloud (`https://api.plane.so`); point it at your own instance when self-hosting.

```ts
import { PlaneClient } from "@hoyasumii/plane";

const client = new PlaneClient({ apiKey: "your-api-key" });

// API v2: path ids are positional and come first, in URL order.
const states = await client.v2.workspaces.projects.states.list("acme", "ENG");

// A fetched row carries its ids, so its children need none.
const eng = await client.v2.workspaces.projects.retrieve("acme", "ENG");
await eng.workItems.create({ name: "Fix login bug", state: "Todo", labels: ["bug"] });

// API v1 is on the client too.
const projects = await client.projects.list("acme");
```

## Using it from an AI agent

Save your settings once and register the MCP server in the clients installed on your machine:

```bash
npx plane mcp config    # asks for the API key, the instance URL and a default workspace
npx plane mcp install   # registers plane-mcp in Claude Code, Codex and OpenCode
```

[MCP setup](./mcp/setup.md) covers the manual configuration and the HTTP transport.

## Using it from the terminal

After `plane mcp config`, every MCP tool is a command:

```bash
npx plane whoami
npx plane list-my-issues
npx plane get-issue --key ACME-14
```

See [CLI](./cli/overview.md).
