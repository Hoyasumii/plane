---
sidebar_position: 2
title: Setup
---

# Setup

## The quick way

Save your settings once, then let the CLI register the server in the clients it finds:

```bash
npx plane mcp config    # asks for the API key, the instance URL, a default workspace and a port
npx plane mcp install   # finds Claude Code, Codex and OpenCode on your PATH and registers plane-mcp (stdio)
```

`install` shows a checklist of the clients it found. Tick the ones you want, and it registers the server
through each client's own CLI, under the name `plane`. The registered command reads the saved configuration
when the client launches it, so no API key ends up in the client's config. See
[`plane mcp install`](../cli/mcp-commands.md#plane-mcp-install) for the flags.

## By hand: stdio

Let the client start `plane-mcp`. It reads the saved configuration, so the client config needs no keys:

```json
{
  "mcpServers": {
    "plane": { "command": "npx", "args": ["-y", "-p", "@hoyasumii/plane", "plane-mcp"] }
  }
}
```

In Claude Code:

```bash
claude mcp add plane -- npx -y -p @hoyasumii/plane plane-mcp
```

Without a saved configuration, or to override it, give the client an `env` block with `PLANE_API_KEY`,
`PLANE_BASE_URL` and `PLANE_WORKSPACE`:

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

## By hand: HTTP

Run one server in the background and point your clients at its URL:

```bash
npx plane mcp start          # prints the URL, http://127.0.0.1:3766/mcp by default
claude mcp add --transport http plane http://127.0.0.1:3766/mcp
```

Without the CLI: `PORT=3766 PLANE_BASE_URL=... PLANE_API_KEY=... npx plane-mcp --http` runs it in the
foreground. `plane-mcp --help` lists the flags. To start the server at every login, run
`npx plane mcp boot enable` (see [`plane mcp boot`](../cli/mcp-commands.md#plane-mcp-boot)).

## Checking it works

Ask your agent to call `plane_whoami`, or run it from the terminal:

```bash
npx plane whoami
```

It answers the key's user, the default workspace, the base URL and the API the instance serves.
