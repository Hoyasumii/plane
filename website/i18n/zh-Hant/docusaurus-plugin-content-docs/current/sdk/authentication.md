---
sidebar_position: 3
title: 身份驗證與 OAuth
description: "使用 API 金鑰或 OAuth 存取權杖對 PlaneClient 進行驗證，並透過 OAuthClient 完成 OAuth 流程。"
---

# 身份驗證與 OAuth

`PlaneClient` 接受以下兩種憑證之一：

| 選項          | 傳送方式                        | 用途                                               |
| ------------- | ------------------------------- | -------------------------------------------------- |
| `apiKey`      | `X-Api-Key: <key>`              | 個人或工作區的 API 權杖                            |
| `accessToken` | `Authorization: Bearer <token>` | 一個 OAuth 存取權杖（一個 Plane 應用、一個機器人） |

`baseUrl` 預設是 Plane Cloud，即 `https://api.plane.so`。自託管時，把它設定為你例項的 URL。
`enableLogging: true` 會把每一次請求和回應都記錄到控制檯，並且會從記錄的請求頭中移除憑證。

```ts
import { PlaneClient } from "@hoyasumii/plane";

const cloud = new PlaneClient({ apiKey: "your-api-key" });

const selfHosted = new PlaneClient({
  baseUrl: "https://plane.example.com",
  accessToken: "your-access-token",
  enableLogging: true,
});
```

## OAuth 應用

`OAuthClient` 獨立處理一個 Plane 應用的 OAuth 流程：它不需要 API 金鑰，只需要該應用的客戶端憑證。

```ts
import { OAuthClient, PlaneClient } from "@hoyasumii/plane";

const oauth = new OAuthClient({
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
  redirectUri: "https://your-app.example.com/oauth/callback",
});

// 1. 把使用者帶到 Plane 上去授權這個應用。
const authorizeUrl = oauth.getAuthorizationUrl("code", "a-random-state");

// 2. 在回撥中，用授權碼換取權杖。
const tokens = await oauth.exchangeCodeForToken("code-from-the-callback");
const client = new PlaneClient({ accessToken: tokens.access_token });

// 3. 之後，重新整理存取權杖。
if (tokens.refresh_token) {
  const refreshed = await oauth.getRefreshToken(tokens.refresh_token);
  void refreshed;
}
```

| 方法                                             | 作用                                       |
| ------------------------------------------------ | ------------------------------------------ |
| `getAuthorizationUrl(responseType?, state?)`     | 用來發起授權流程的 URL                     |
| `exchangeCodeForToken(code, grantType?)`         | 用授權碼換取一個存取權杖和一個重新整理權杖 |
| `getRefreshToken(refreshToken)`                  | 用重新整理權杖換取一個新的存取權杖         |
| `getBotToken(appInstallationId)`                 | 一次應用安裝的機器人權杖（客戶端憑證）     |
| `getAppInstallations(token, appInstallationId?)` | 該應用的所有安裝，或其中的一個             |
