---
sidebar_position: 3
title: Authentifizierung und OAuth
description: "PlaneClient mit einem API-Schlüssel oder einem OAuth-Access-Token authentifizieren und den OAuth-Ablauf mit OAuthClient durchlaufen."
---

# Authentifizierung und OAuth

`PlaneClient` nimmt eine von zwei Anmeldeinformationen entgegen:

| Option        | Gesendet als                    | Verwende es für                                  |
| ------------- | ------------------------------- | ------------------------------------------------ |
| `apiKey`      | `X-Api-Key: <key>`              | ein persönliches oder Arbeitsbereichs-API-Token  |
| `accessToken` | `Authorization: Bearer <token>` | ein OAuth-Access-Token (eine Plane-App, ein Bot) |

`baseUrl` verwendet standardmäßig Plane Cloud, `https://api.plane.so`. Setze sie beim Self-Hosting auf die URL
deiner Instanz. `enableLogging: true` loggt jede Anfrage und Antwort in die Konsole, wobei Anmeldeinformationen
aus den geloggten Headern entfernt werden.

```ts
import { PlaneClient } from "@hoyasumii/plane";

const cloud = new PlaneClient({ apiKey: "your-api-key" });

const selfHosted = new PlaneClient({
  baseUrl: "https://plane.example.com",
  accessToken: "your-access-token",
  enableLogging: true,
});
```

## OAuth-Apps

`OAuthClient` handhabt den OAuth-Flow einer Plane-App eigenständig: Er braucht keinen API-Schlüssel, nur die
Client-Anmeldedaten der App.

```ts
import { OAuthClient, PlaneClient } from "@hoyasumii/plane";

const oauth = new OAuthClient({
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
  redirectUri: "https://your-app.example.com/oauth/callback",
});

// 1. Den Benutzer zu Plane schicken, damit er die App autorisiert.
const authorizeUrl = oauth.getAuthorizationUrl("code", "a-random-state");

// 2. Im Callback den Code gegen Tokens tauschen.
const tokens = await oauth.exchangeCodeForToken("code-from-the-callback");
const client = new PlaneClient({ accessToken: tokens.access_token });

// 3. Später das Access-Token erneuern.
if (tokens.refresh_token) {
  const refreshed = await oauth.getRefreshToken(tokens.refresh_token);
  void refreshed;
}
```

| Methode                                          | Was sie tut                                                            |
| ------------------------------------------------ | ---------------------------------------------------------------------- |
| `getAuthorizationUrl(responseType?, state?)`     | die URL, die den Autorisierungs-Flow startet                           |
| `exchangeCodeForToken(code, grantType?)`         | tauscht den Autorisierungscode gegen ein Access- und ein Refresh-Token |
| `getRefreshToken(refreshToken)`                  | ein neues Access-Token aus einem Refresh-Token                         |
| `getBotToken(appInstallationId)`                 | ein Bot-Token für eine App-Installation (Client Credentials)           |
| `getAppInstallations(token, appInstallationId?)` | die Installationen der App, oder eine davon                            |
