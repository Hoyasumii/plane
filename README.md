# @hoyasumii/plane

A TypeScript SDK for the [Plane](https://plane.so) API, with an MCP server and a CLI built on top of it.
Use it from code, from an AI agent, or from your terminal: all three share the same client.

**Documentation: [hoyasumii.github.io/plane](https://hoyasumii.github.io/plane/)** (English and Português).

- **SDK**: a typed client for API v1 and the whole v2 surface (`client.v2`, 90 resources). `fields`
  narrows the return type at compile time, and fetched rows can be navigated to their children.
- **MCP server** (`@hoyasumii/plane/mcp`): stdio or Streamable HTTP. It has task tools that work with
  keys and names (`ACME-130`, `"Todo"`, `"me"`) and generic tools that reach every v2 method.
- **CLI** (`plane`): every MCP tool as a subcommand, plus `plane mcp` to configure the server, run it in
  the background, start it at login and register it in Claude Code, Codex and OpenCode.
- Works with Plane Cloud and self-hosted instances, including self-hosted 1.4.x, which has no API v2.

## Installation

Requires Node.js 20 or later.

```bash
npm install @hoyasumii/plane
# or
pnpm add @hoyasumii/plane
```

## Quick Start

```ts
import { PlaneClient } from "@hoyasumii/plane";

const client = new PlaneClient({ apiKey: "your-api-key" });

// Or against a self-hosted instance, with an OAuth access token:
const selfHosted = new PlaneClient({
  baseUrl: "https://plane.example.com",
  accessToken: "your-access-token",
});

// API v2: path ids are positional and come first, in URL order.
await client.v2.workspaces.projects.states.list("acme", "ENG");

// A fetched row carries its ids, so its children need none.
const eng = await client.v2.workspaces.projects.retrieve("acme", "ENG");
await eng.workItems.create({ name: "Fix login bug", state: "Todo", labels: ["bug"] });

// API v1: every workspace-scoped call takes the workspace slug first.
const projects = await client.projects.list("workspace-slug");
```

## MCP server and CLI

Save your settings once, then register the MCP server in the clients on your machine:

```bash
npx plane mcp config                 # the API key, the instance URL, a default workspace
npx plane mcp install                # registers plane-mcp in Claude Code, Codex and OpenCode
```

The same tools work from the terminal:

```bash
npx plane whoami
npx plane list-my-issues
npx plane get-issue --key ACME-14
```

## Documentation

| Topic                                                                       | What it covers                                                        |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [Getting started](https://hoyasumii.github.io/plane/docs/intro)             | installation, the first calls, the three ways to use the package      |
| [API v2](https://hoyasumii.github.io/plane/docs/sdk/v2/overview)            | the flat path, loaded rows, field projection, bulk writes, pagination |
| [API v1](https://hoyasumii.github.io/plane/docs/sdk/v1)                     | the v1 resources and their sub-resources                              |
| [Authentication](https://hoyasumii.github.io/plane/docs/sdk/authentication) | API keys, access tokens and the OAuth client                          |
| [MCP server](https://hoyasumii.github.io/plane/docs/mcp/overview)           | transports, every tool, configuration, programmatic use               |
| [CLI](https://hoyasumii.github.io/plane/docs/cli/overview)                  | tools as commands, `plane mcp`, Windows and WSL                       |
| [API reference](https://hoyasumii.github.io/plane/docs/api)                 | every exported class, type and function, generated from the source    |
| [Contributing](https://hoyasumii.github.io/plane/docs/contributing)         | building, testing, and how the v2 surface is kept honest              |

The site's source is in `website/`: `pnpm docs:dev` previews it.

## License

MIT. See [LICENSE](LICENSE).

This project started from [makeplane/plane-node-sdk](https://github.com/makeplane/plane-node-sdk) and is
developed independently. It is not affiliated with or endorsed by Plane Software, Inc. "Plane" is their
trademark.
