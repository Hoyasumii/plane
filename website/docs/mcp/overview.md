---
sidebar_position: 1
title: MCP server overview
---

# MCP server

`@hoyasumii/plane/mcp` turns the SDK into an [MCP](https://modelcontextprotocol.io) server, so Claude Code,
Codex, OpenCode, Claude Desktop or any other MCP client can work with Plane.

## Two transports

| Transport           | Who runs the server                                      | How to start it                                      |
| ------------------- | -------------------------------------------------------- | ---------------------------------------------------- |
| **stdio** (default) | the MCP client launches `plane-mcp` and owns the process | `plane mcp install`, or register `plane-mcp` by hand |
| **Streamable HTTP** | one long-running server that several clients share       | `plane mcp start`, `plane-mcp --http`, or from code  |

In stdio mode the server starts with the client and ends when the client closes stdin. stdout carries the
protocol, so the server logs to stderr only. In HTTP mode it listens on `127.0.0.1` only, stateless over
Streamable HTTP (`POST /mcp`), and its cache is shared by every client that connects.

## Three kinds of tools

- **[Task tools](./task-tools.md)** (`plane_get_issue`, `plane_update_issue`, `plane_add_comment`, …) are the
  stable contract task-driven agent workflows rely on. They take tasks by key (`ACME-130`) and projects, states,
  labels and members by name, and they answer readable output with no ids. They always use API v1, which both
  Plane Cloud and self-hosted serve.
- **[Work item tools](./work-item-tools.md)** (`plane_list_work_items`, `plane_get_work_item`,
  `plane_create_work_item`, `plane_update_work_item`) use API v2, with its filters, `fields` and `expand`.
- **[Generic tools](./generic-tools.md)** (`plane_resources`, `plane_describe`, `plane_call`) reach every
  other v2 method, across all 90 resources.

## Instances without API v2

Self-hosted Plane 1.4.x answers 404 to every `/api/v2` route. The server finds out with one
`GET /api/v2/users/me/` the first time it needs to, and remembers the answer for the life of the process. A bad
key or a network error is not remembered. On such an instance:

- The task tools work as usual, since they use v1 anyway.
- The `*_work_item` tools answer through v1 with the same inputs. Parameters only v2 can serve (`cycle_id`,
  `module_id`, `order_by`, `fields`, `expand`, `type`, `estimate`) fail by name.
- `plane_resources` and `plane_call` say that v2 is unavailable and point to the typed tools, instead of
  relaying a 404. `plane_describe` still works, because it reads only the catalog.

`plane_whoami` reports which API the instance serves (`v1` or `v2`).

## Next steps

- [Setup](./setup.md): register the server in your MCP client.
- [Configuration](./configuration.md): the settings and where they are saved.
- [Programmatic use](./programmatic.md): start the server from your own code.
