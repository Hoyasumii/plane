---
sidebar_position: 2
title: Configuración inicial
description: "Guarda tus ajustes una vez y registra el servidor MCP de Plane en Claude Code, Codex y OpenCode."
---

# Configuración inicial

## El camino rápido

Guarda tu configuración una vez, y deja que la CLI registre el servidor en los clientes que encuentre:

```bash
npx plane mcp config    # pide la clave de API, la URL de la instancia, un workspace por defecto y un puerto
npx plane mcp install   # encuentra Claude Code, Codex y OpenCode en tu PATH y registra plane-mcp (stdio)
```

`install` muestra una lista de comprobación de los clientes que encontró. Marca los que quieras, y registra el
servidor mediante la propia CLI de cada cliente, bajo el nombre `plane`. El comando registrado lee la
configuración guardada cuando el cliente lo lanza, así que ninguna clave de API acaba en la configuración del
cliente. Consulta [`plane mcp install`](../cli/mcp-commands.md#plane-mcp-install) para ver los flags.

## A mano: stdio

Deja que el cliente inicie `plane-mcp`. Lee la configuración guardada, así que la configuración del cliente no
necesita claves:

```json
{
  "mcpServers": {
    "plane": { "command": "npx", "args": ["-y", "-p", "@hoyasumii/plane", "plane-mcp"] }
  }
}
```

En Claude Code:

```bash
claude mcp add plane -- npx -y -p @hoyasumii/plane plane-mcp
```

Sin una configuración guardada, o para sobrescribirla, dale al cliente un bloque `env` con `PLANE_API_KEY`,
`PLANE_BASE_URL` y `PLANE_WORKSPACE`:

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

## A mano: HTTP

Ejecuta un servidor en segundo plano y apunta tus clientes a su URL:

```bash
npx plane mcp start          # imprime la URL, http://127.0.0.1:3766/mcp por defecto
claude mcp add --transport http plane http://127.0.0.1:3766/mcp
```

Sin la CLI: `PORT=3766 PLANE_BASE_URL=... PLANE_API_KEY=... npx plane-mcp --http` lo ejecuta en primer plano.
`plane-mcp --help` lista los flags. Para iniciar el servidor en cada inicio de sesión, ejecuta
`npx plane mcp boot enable` (consulta [`plane mcp boot`](../cli/mcp-commands.md#plane-mcp-boot)).

## Comprobar que funciona

Pide a tu agente que llame a `plane_whoami`, o ejecútalo desde la terminal:

```bash
npx plane whoami
```

Responde con el usuario de la clave, el workspace por defecto, la URL base y la API que sirve la instancia.
