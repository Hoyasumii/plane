---
sidebar_position: 3
title: Autenticação e OAuth
description: "Autentique o PlaneClient com uma chave de API ou um token de acesso OAuth, e conduza o fluxo OAuth com o OAuthClient."
---

# Autenticação e OAuth

`PlaneClient` recebe uma de duas credenciais:

| Opção         | Enviada como                    | Utilize para                                           |
| ------------- | ------------------------------- | ------------------------------------------------------ |
| `apiKey`      | `X-Api-Key: <key>`              | um token de API pessoal ou de workspace                |
| `accessToken` | `Authorization: Bearer <token>` | um access token OAuth (uma aplicação do Plane, um bot) |

Por predefinição, `baseUrl` aponta para o Plane Cloud, `https://api.plane.so`. Altere-o para o URL da sua
instância quando estiver a fazer self-hosting. `enableLogging: true` regista na consola cada pedido e resposta,
com as credenciais removidas dos cabeçalhos registados.

```ts
import { PlaneClient } from "@hoyasumii/plane";

const cloud = new PlaneClient({ apiKey: "your-api-key" });

const selfHosted = new PlaneClient({
  baseUrl: "https://plane.example.com",
  accessToken: "your-access-token",
  enableLogging: true,
});
```

## Aplicações OAuth

`OAuthClient` trata, por si só, do fluxo OAuth de uma aplicação do Plane: não precisa de chave de API, apenas
das credenciais de cliente da aplicação.

```ts
import { OAuthClient, PlaneClient } from "@hoyasumii/plane";

const oauth = new OAuthClient({
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
  redirectUri: "https://your-app.example.com/oauth/callback",
});

// 1. Envie o utilizador para o Plane para autorizar a aplicação.
const authorizeUrl = oauth.getAuthorizationUrl("code", "a-random-state");

// 2. No callback, troque o código pelos tokens.
const tokens = await oauth.exchangeCodeForToken("code-from-the-callback");
const client = new PlaneClient({ accessToken: tokens.access_token });

// 3. Mais tarde, renove o access token.
if (tokens.refresh_token) {
  const refreshed = await oauth.getRefreshToken(tokens.refresh_token);
  void refreshed;
}
```

| Método                                           | O que faz                                                             |
| ------------------------------------------------ | --------------------------------------------------------------------- |
| `getAuthorizationUrl(responseType?, state?)`     | o URL que inicia o fluxo de autorização                               |
| `exchangeCodeForToken(code, grantType?)`         | troca o código de autorização por um access token e um refresh token  |
| `getRefreshToken(refreshToken)`                  | um novo access token a partir de um refresh token                     |
| `getBotToken(appInstallationId)`                 | um token de bot para uma instalação da aplicação (client credentials) |
| `getAppInstallations(token, appInstallationId?)` | as instalações da aplicação, ou uma delas                             |
