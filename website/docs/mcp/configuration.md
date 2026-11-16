---
sidebar_position: 6
title: Configuration
description: "The four settings the MCP server, the plane-mcp bin and the plane CLI share, where they are saved and which one wins."
---

# Configuration

The server, the `plane-mcp` bin and the `plane` CLI read the same four settings:

| Setting           | Flag          | Default                | Meaning                                                       |
| ----------------- | ------------- | ---------------------- | ------------------------------------------------------------- |
| `PLANE_API_KEY`   | `--api-key`   | none (required)        | the Plane API key, sent as `X-Api-Key`                        |
| `PLANE_BASE_URL`  | `--base-url`  | `https://api.plane.so` | the Plane instance: Plane Cloud, or your self-hosted URL      |
| `PLANE_WORKSPACE` | `--workspace` | none                   | a default workspace: with it, every tool's `slug` is optional |
| `PORT`            | `--port`      | `3766`                 | the HTTP server's port on `127.0.0.1`                         |

Each one is taken from the first of: a flag, the environment, the saved file, the default. The resolution lives
in `resolveMcpConfig` (`src/mcp/config.ts`).

## The saved file

`plane mcp config` saves the settings to a per-user `.env`:

| OS      | Path                                                 |
| ------- | ---------------------------------------------------- |
| Linux   | `~/.config/plane/.env` (honouring `XDG_CONFIG_HOME`) |
| macOS   | `~/Library/Application Support/plane/.env`           |
| Windows | `%APPDATA%\plane\.env`                               |

`PLANE_CONFIG` (or `--config`) points at another file instead. The background server's pid file and log live
in a `run/` folder beside it.

```text
PLANE_API_KEY=plane_api_0123456789abcdef
PLANE_BASE_URL=https://plane.example.com
PLANE_WORKSPACE=acme
PORT=3766
```

Every `plane` command except `plane mcp config` and `plane mcp uninstall` refuses to run until that file holds
an API key. Flags and environment variables then override the saved values for that run only. `plane-mcp` and
the in-process `plane <tool>` read the saved file too.

See [`plane mcp config`](../cli/mcp-commands.md#plane-mcp-config) for the three ways to write it.

## Behind Cloudflare Access

When the Plane instance sits behind [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/),
its API answers with Access' sign-in page and the API key never reaches Plane. Add one more line to the saved file:

```text
PLANE_CF_ACCESS=cloudflared
```

With it, every request also carries `cf-access-token`, taken from `cloudflared access token -app=<PLANE_BASE_URL>`
for the user signed in to Access. Install [`cloudflared`](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)
and sign in once (again whenever the Access session expires):

```bash
cloudflared access login https://plane.example.com
```

The token is reused until shortly before it expires. A missing login, an expired one or the sign-in page itself
fails with a `CloudflareAccessError` that names the command to run. `plane mcp config` does not ask for this
setting, but keeps it when it saves. From code, pass `headers: cloudflaredAccessHeaders(baseUrl)` to `PlaneClient`.

## From code

The same resolution is exported, for tools that want to reuse the saved configuration:

```ts
import { configFilePath, readEnvFile, resolveMcpConfig, startPlaneMcpServer } from "@hoyasumii/plane/mcp";

const config = resolveMcpConfig({ env: process.env, file: readEnvFile(configFilePath()) });
if (!config.apiKey) throw new Error("run `plane mcp config` first");

const server = await startPlaneMcpServer(config);
console.log(server.url);
```
