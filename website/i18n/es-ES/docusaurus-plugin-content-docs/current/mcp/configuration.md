---
sidebar_position: 6
title: Configuración
description: "Los cuatro ajustes que comparten el servidor MCP, el bin plane-mcp y la CLI plane, dónde se guardan y cuál prevalece."
---

# Configuración

El servidor, el binario `plane-mcp` y la CLI `plane` leen los mismos cuatro ajustes:

| Ajuste            | Flag          | Por defecto            | Significado                                                                 |
| ----------------- | ------------- | ---------------------- | --------------------------------------------------------------------------- |
| `PLANE_API_KEY`   | `--api-key`   | ninguno (obligatorio)  | la clave de API de Plane, enviada como `X-Api-Key`                          |
| `PLANE_BASE_URL`  | `--base-url`  | `https://api.plane.so` | la instancia de Plane: Plane Cloud, o tu URL self-hosted                    |
| `PLANE_WORKSPACE` | `--workspace` | ninguno                | un workspace por defecto: con él, el `slug` de cada herramienta es opcional |
| `PORT`            | `--port`      | `3766`                 | el puerto del servidor HTTP en `127.0.0.1`                                  |

Cada uno se toma del primero que exista entre: un flag, el entorno, el archivo guardado, el valor por defecto.
La resolución vive en `resolveMcpConfig` (`src/mcp/config.ts`).

## El archivo guardado

`plane mcp config` guarda los ajustes en un `.env` por usuario:

| SO      | Ruta                                                  |
| ------- | ----------------------------------------------------- |
| Linux   | `~/.config/plane/.env` (respetando `XDG_CONFIG_HOME`) |
| macOS   | `~/Library/Application Support/plane/.env`            |
| Windows | `%APPDATA%\plane\.env`                                |

`PLANE_CONFIG` (o `--config`) apunta a otro archivo en su lugar. El archivo pid y el log del servidor en segundo
plano viven en una carpeta `run/` junto a él.

```text
PLANE_API_KEY=plane_api_0123456789abcdef
PLANE_BASE_URL=https://plane.example.com
PLANE_WORKSPACE=acme
PORT=3766
```

Todo comando `plane` salvo `plane mcp config` y `plane mcp uninstall` se niega a ejecutarse hasta que ese
archivo tenga una clave de API. Los flags y las variables de entorno sobrescriben entonces los valores
guardados solo para esa ejecución. `plane-mcp` y el `plane <herramienta>` en el mismo proceso también leen el
archivo guardado.

Consulta [`plane mcp config`](../cli/mcp-commands.md#plane-mcp-config) para ver las tres formas de escribirlo.

## Desde código

La misma resolución se exporta, para las herramientas que quieran reutilizar la configuración guardada:

```ts
import { configFilePath, readEnvFile, resolveMcpConfig, startPlaneMcpServer } from "@hoyasumii/plane/mcp";

const config = resolveMcpConfig({ env: process.env, file: readEnvFile(configFilePath()) });
if (!config.apiKey) throw new Error("run `plane mcp config` first");

const server = await startPlaneMcpServer(config);
console.log(server.url);
```
