---
sidebar_position: 3
title: Authentication and OAuth
---

# Authentication and OAuth

`PlaneClient` takes one of two credentials:

| Option        | Sent as                         | Use it for                                 |
| ------------- | ------------------------------- | ------------------------------------------ |
| `apiKey`      | `X-Api-Key: <key>`              | a personal or workspace API token          |
| `accessToken` | `Authorization: Bearer <token>` | an OAuth access token (a Plane app, a bot) |

`baseUrl` defaults to Plane Cloud, `https://api.plane.so`. Set it to your instance's URL when self-hosting.
`enableLogging: true` logs every request and response to the console, with credentials removed from the
logged headers.

```ts
import { PlaneClient } from "@hoyasumii/plane";

const cloud = new PlaneClient({ apiKey: "your-api-key" });

const selfHosted = new PlaneClient({
  baseUrl: "https://plane.example.com",
  accessToken: "your-access-token",
  enableLogging: true,
});
```

## OAuth apps

`OAuthClient` handles the OAuth flow of a Plane app on its own: it needs no API key, only the app's client
credentials.

```ts
import { OAuthClient, PlaneClient } from "@hoyasumii/plane";

const oauth = new OAuthClient({
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
  redirectUri: "https://your-app.example.com/oauth/callback",
});

// 1. Send the user to Plane to authorize the app.
const authorizeUrl = oauth.getAuthorizationUrl("code", "a-random-state");

// 2. On the callback, exchange the code for tokens.
const tokens = await oauth.exchangeCodeForToken("code-from-the-callback");
const client = new PlaneClient({ accessToken: tokens.access_token });

// 3. Later, refresh the access token.
if (tokens.refresh_token) {
  const refreshed = await oauth.getRefreshToken(tokens.refresh_token);
  void refreshed;
}
```

| Method                                           | What it does                                                    |
| ------------------------------------------------ | --------------------------------------------------------------- |
| `getAuthorizationUrl(responseType?, state?)`     | the URL that starts the authorization flow                      |
| `exchangeCodeForToken(code, grantType?)`         | trades the authorization code for an access and a refresh token |
| `getRefreshToken(refreshToken)`                  | a new access token from a refresh token                         |
| `getBotToken(appInstallationId)`                 | a bot token for an app installation (client credentials)        |
| `getAppInstallations(token, appInstallationId?)` | the app's installations, or one of them                         |
