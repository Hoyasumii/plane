---
sidebar_position: 3
title: Autenticación y OAuth
description: "Autentica PlaneClient con una clave de API o un token de acceso OAuth, y completa el flujo OAuth con OAuthClient."
---

# Autenticación y OAuth

`PlaneClient` acepta una de dos credenciales:

| Opción        | Se envía como                   | Úsala para                                          |
| ------------- | ------------------------------- | --------------------------------------------------- |
| `apiKey`      | `X-Api-Key: <key>`              | un token de API personal o de workspace             |
| `accessToken` | `Authorization: Bearer <token>` | un token de acceso OAuth (una app de Plane, un bot) |

`baseUrl` usa por defecto Plane Cloud, `https://api.plane.so`. Cámbialo por la URL de tu instancia si eres
self-hosted. `enableLogging: true` registra cada petición y respuesta en la consola, con las credenciales
eliminadas de las cabeceras registradas.

```ts
import { PlaneClient } from "@hoyasumii/plane";

const cloud = new PlaneClient({ apiKey: "your-api-key" });

const selfHosted = new PlaneClient({
  baseUrl: "https://plane.example.com",
  accessToken: "your-access-token",
  enableLogging: true,
});
```

## Apps OAuth

`OAuthClient` gestiona por sí solo el flujo OAuth de una app de Plane: no necesita una clave de API, solo las
credenciales de cliente de la app.

```ts
import { OAuthClient, PlaneClient } from "@hoyasumii/plane";

const oauth = new OAuthClient({
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
  redirectUri: "https://your-app.example.com/oauth/callback",
});

// 1. Envía al usuario a Plane para que autorice la app.
const authorizeUrl = oauth.getAuthorizationUrl("code", "a-random-state");

// 2. En el callback, cambia el código por los tokens.
const tokens = await oauth.exchangeCodeForToken("code-from-the-callback");
const client = new PlaneClient({ accessToken: tokens.access_token });

// 3. Más adelante, renueva el access token.
if (tokens.refresh_token) {
  const refreshed = await oauth.getRefreshToken(tokens.refresh_token);
  void refreshed;
}
```

| Método                                           | Qué hace                                                                |
| ------------------------------------------------ | ----------------------------------------------------------------------- |
| `getAuthorizationUrl(responseType?, state?)`     | la URL que inicia el flujo de autorización                              |
| `exchangeCodeForToken(code, grantType?)`         | cambia el código de autorización por un access token y un refresh token |
| `getRefreshToken(refreshToken)`                  | un nuevo access token a partir de un refresh token                      |
| `getBotToken(appInstallationId)`                 | un bot token para una instalación de app (client credentials)           |
| `getAppInstallations(token, appInstallationId?)` | las instalaciones de la app, o una de ellas                             |
