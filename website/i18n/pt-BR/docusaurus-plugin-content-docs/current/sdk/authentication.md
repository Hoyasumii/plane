---
sidebar_position: 3
title: Autenticação e OAuth
---

# Autenticação e OAuth

`PlaneClient` recebe uma de duas credenciais:

| Opção         | Enviada como                    | Use para                                        |
| ------------- | ------------------------------- | ----------------------------------------------- |
| `apiKey`      | `X-Api-Key: <key>`              | um token de API pessoal ou de workspace         |
| `accessToken` | `Authorization: Bearer <token>` | um access token OAuth (um app do Plane, um bot) |

`baseUrl` aponta por padrão para o Plane Cloud, `https://api.plane.so`. Troque pela URL da sua instância se for
self-hosted. `enableLogging: true` registra no console cada requisição e resposta, com as credenciais removidas
dos headers registrados.

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

`OAuthClient` cuida sozinho do fluxo OAuth de um app do Plane: não precisa de chave de API, só das credenciais
de cliente do app.

```ts
import { OAuthClient, PlaneClient } from "@hoyasumii/plane";

const oauth = new OAuthClient({
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
  redirectUri: "https://your-app.example.com/oauth/callback",
});

// 1. Mande o usuário ao Plane para autorizar o app.
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

| Método                                           | O que faz                                                            |
| ------------------------------------------------ | -------------------------------------------------------------------- |
| `getAuthorizationUrl(responseType?, state?)`     | a URL que inicia o fluxo de autorização                              |
| `exchangeCodeForToken(code, grantType?)`         | troca o código de autorização por um access token e um refresh token |
| `getRefreshToken(refreshToken)`                  | um novo access token a partir de um refresh token                    |
| `getBotToken(appInstallationId)`                 | um token de bot para uma instalação do app (client credentials)      |
| `getAppInstallations(token, appInstallationId?)` | as instalações do app, ou uma delas                                  |
