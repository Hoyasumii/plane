---
sidebar_position: 3
title: 身份验证与 OAuth
description: "使用 API 密钥或 OAuth 访问令牌对 PlaneClient 进行身份验证，并通过 OAuthClient 完成 OAuth 流程。"
---

# 身份验证与 OAuth

`PlaneClient` 接受以下两种凭证之一：

| 选项          | 发送方式                        | 用途                                               |
| ------------- | ------------------------------- | -------------------------------------------------- |
| `apiKey`      | `X-Api-Key: <key>`              | 个人或工作区的 API 令牌                            |
| `accessToken` | `Authorization: Bearer <token>` | 一个 OAuth 访问令牌（一个 Plane 应用、一个机器人） |

`baseUrl` 默认是 Plane Cloud，即 `https://api.plane.so`。自托管时，把它设置为你实例的 URL。
`enableLogging: true` 会把每一次请求和响应都记录到控制台，并且会从记录的请求头中移除凭证。

```ts
import { PlaneClient } from "@hoyasumii/plane";

const cloud = new PlaneClient({ apiKey: "your-api-key" });

const selfHosted = new PlaneClient({
  baseUrl: "https://plane.example.com",
  accessToken: "your-access-token",
  enableLogging: true,
});
```

## OAuth 应用

`OAuthClient` 独立处理一个 Plane 应用的 OAuth 流程：它不需要 API 密钥，只需要该应用的客户端凭证。

```ts
import { OAuthClient, PlaneClient } from "@hoyasumii/plane";

const oauth = new OAuthClient({
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
  redirectUri: "https://your-app.example.com/oauth/callback",
});

// 1. 把用户带到 Plane 上去授权这个应用。
const authorizeUrl = oauth.getAuthorizationUrl("code", "a-random-state");

// 2. 在回调中，用授权码换取令牌。
const tokens = await oauth.exchangeCodeForToken("code-from-the-callback");
const client = new PlaneClient({ accessToken: tokens.access_token });

// 3. 之后，刷新访问令牌。
if (tokens.refresh_token) {
  const refreshed = await oauth.getRefreshToken(tokens.refresh_token);
  void refreshed;
}
```

| 方法                                             | 作用                                   |
| ------------------------------------------------ | -------------------------------------- |
| `getAuthorizationUrl(responseType?, state?)`     | 用来发起授权流程的 URL                 |
| `exchangeCodeForToken(code, grantType?)`         | 用授权码换取一个访问令牌和一个刷新令牌 |
| `getRefreshToken(refreshToken)`                  | 用刷新令牌换取一个新的访问令牌         |
| `getBotToken(appInstallationId)`                 | 一次应用安装的机器人令牌（客户端凭证） |
| `getAppInstallations(token, appInstallationId?)` | 该应用的所有安装，或其中的一个         |
