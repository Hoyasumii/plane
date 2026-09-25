---
sidebar_position: 1
title: CLI overview
---

# CLI

The package installs a `plane` command. It is an MCP client of the [same server](../mcp/overview.md): every MCP
tool becomes a subcommand, and the tool's input schema becomes its flags. By default the server runs inside the
command, so there is nothing to start first.

```bash
npx plane mcp config                 # once: save the API key (PLANE_BASE_URL defaults to https://api.plane.so)
npx plane tools                      # every command, one per MCP tool
npx plane whoami
npx plane get-issue --key ACME-14
npx plane list-my-issues --project ACME
npx plane list-work-items --slug acme --project ENG --per-page 20 --fields name,state_id
npx plane get-work-item --slug acme --work-item ENG-123
npx plane resources --query cycle
npx plane describe --resource workspaces.projects.cycles --method delete
npx plane call --resource workspaces.projects.cycles --method delete \
  --args '{"slug":"acme","project":"ENG","cycle":"<cycle-id>"}' --confirm
```

Nothing but `--help`, `--version` and `plane docs` runs until `plane mcp config` has saved a configuration with
an API key. `plane docs` prints the link to this site and opens it in the browser.

## From tools to commands

- The command is the tool's name without `plane_`, in kebab-case: `plane_list_work_items` → `list-work-items`.
- Each flag is an input in kebab-case: `per_page` → `--per-page`, `workItem` → `--work-item`.
- Array flags take `a,b` or JSON, object flags take JSON, and boolean flags need no value.
- `plane <command> --help` lists a command's flags, with the allowed values of enum inputs.

Tool output goes to stdout. A tool error goes to stderr with exit code 1.

## Talking to a running server

To use a `plane-mcp` that is already running over HTTP instead of the in-process one, pass
`--url http://127.0.0.1:3766/mcp` or set `PLANE_MCP_URL`. `--base-url` and `--api-key` override the
environment and the saved file for the in-process server.

None of these flags stands in for the saved configuration: the CLI refuses to run tools without it, even when
`--url` or `--api-key` is given.

## Managing the server

`plane mcp` is intercepted before any connection is made. It configures the server, runs it in the background,
starts it at login and registers it in your MCP clients. See [`plane mcp`](./mcp-commands.md).
