---
sidebar_position: 3
title: Authentification et OAuth
description: "Authentifier PlaneClient avec une clé d'API ou un jeton d'accès OAuth, et mener le flux OAuth avec OAuthClient."
---

# Authentification et OAuth

`PlaneClient` prend l'un de ces deux identifiants :

| Option        | Envoyé comme                    | À utiliser pour                                        |
| ------------- | ------------------------------- | ------------------------------------------------------ |
| `apiKey`      | `X-Api-Key: <key>`              | un jeton d'API personnel ou d'espace de travail        |
| `accessToken` | `Authorization: Bearer <token>` | un jeton d'accès OAuth (une application Plane, un bot) |

`baseUrl` vaut par défaut Plane Cloud, `https://api.plane.so`. Définissez-le à l'URL de votre instance en cas
d'auto-hébergement. `enableLogging: true` journalise chaque requête et réponse dans la console, avec les
identifiants retirés des en-têtes journalisés.

```ts
import { PlaneClient } from "@hoyasumii/plane";

const cloud = new PlaneClient({ apiKey: "your-api-key" });

const selfHosted = new PlaneClient({
  baseUrl: "https://plane.example.com",
  accessToken: "your-access-token",
  enableLogging: true,
});
```

## Applications OAuth

`OAuthClient` gère lui-même le flux OAuth d'une application Plane : il n'a besoin d'aucune clé d'API,
seulement des identifiants client de l'application.

```ts
import { OAuthClient, PlaneClient } from "@hoyasumii/plane";

const oauth = new OAuthClient({
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
  redirectUri: "https://your-app.example.com/oauth/callback",
});

// 1. Envoyer l'utilisateur vers Plane pour autoriser l'application.
const authorizeUrl = oauth.getAuthorizationUrl("code", "a-random-state");

// 2. Sur le callback, échanger le code contre des jetons.
const tokens = await oauth.exchangeCodeForToken("code-from-the-callback");
const client = new PlaneClient({ accessToken: tokens.access_token });

// 3. Plus tard, rafraîchir le jeton d'accès.
if (tokens.refresh_token) {
  const refreshed = await oauth.getRefreshToken(tokens.refresh_token);
  void refreshed;
}
```

| Méthode                                          | Ce qu'elle fait                                                                        |
| ------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `getAuthorizationUrl(responseType?, state?)`     | l'URL qui démarre le flux d'autorisation                                               |
| `exchangeCodeForToken(code, grantType?)`         | échange le code d'autorisation contre un jeton d'accès et un jeton de rafraîchissement |
| `getRefreshToken(refreshToken)`                  | un nouveau jeton d'accès à partir d'un jeton de rafraîchissement                       |
| `getBotToken(appInstallationId)`                 | un jeton de bot pour une installation d'application (identifiants client)              |
| `getAppInstallations(token, appInstallationId?)` | les installations de l'application, ou l'une d'elles                                   |
