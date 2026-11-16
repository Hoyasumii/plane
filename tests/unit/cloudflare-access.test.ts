import nock from "nock";
import { cloudflaredAccessHeaders, isAccessLoginPage } from "../../src/client/cloudflare-access";
import { PlaneClient } from "../../src/client/plane-client";
import { CloudflareAccessError } from "../../src/errors";
import { parseCfAccess, resolveMcpConfig } from "../../src/mcp/config";

const BASE = "https://plane.example.test";

function jwt(exp: number): string {
  const part = (value: object): string => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "RS256" })}.${part({ exp })}.signature`;
}

afterEach(() => {
  nock.cleanAll();
});

describe("cloudflaredAccessHeaders", () => {
  it("asks cloudflared for the app's token and caches it until shortly before it expires", () => {
    let now = 1_000_000_000_000;
    const calls: string[][] = [];
    const token = jwt(now / 1000 + 3600);
    const headers = cloudflaredAccessHeaders(BASE, {
      now: () => now,
      run: (args) => {
        calls.push(args);
        return `${token}\n`;
      },
    });

    expect(headers()).toEqual({ "cf-access-token": token });
    expect(headers()).toEqual({ "cf-access-token": token });
    expect(calls).toEqual([["access", "token", `-app=${BASE}`]]);

    now += 3600 * 1000 - 30_000; // inside the renewal margin
    headers();
    expect(calls).toHaveLength(2);
  });

  it("says to log in when cloudflared fails or hands back an expired token", () => {
    const failing = cloudflaredAccessHeaders(BASE, {
      run: () => {
        throw Object.assign(new Error("exit 1"), { status: 1 });
      },
    });
    expect(failing).toThrow(CloudflareAccessError);
    expect(failing).toThrow(`cloudflared access login ${BASE}`);

    const expired = cloudflaredAccessHeaders(BASE, { now: () => 2_000_000_000_000, run: () => jwt(1) });
    expect(expired).toThrow(`cloudflared access login ${BASE}`);
  });

  it("says when cloudflared is not installed", () => {
    const missing = cloudflaredAccessHeaders(BASE, {
      run: () => {
        throw Object.assign(new Error("spawn cloudflared ENOENT"), { code: "ENOENT" });
      },
    });
    expect(missing).toThrow("not installed");
  });
});

describe("requests behind Cloudflare Access", () => {
  it("sends the extra headers on v1 and v2 requests", async () => {
    const token = jwt(Math.floor(Date.now() / 1000) + 3600);
    const client = new PlaneClient({ baseUrl: BASE, apiKey: "secret", headers: () => ({ "cf-access-token": token }) });
    const v1 = nock(BASE, { reqheaders: { "cf-access-token": token, "x-api-key": "secret" } })
      .get("/api/v1/users/me/")
      .reply(200, { id: "u1" });
    const v2 = nock(BASE, { reqheaders: { "cf-access-token": token, "x-api-key": "secret" } })
      .get("/api/v2/workspaces/acme/projects/")
      .reply(200, { data: [], pagination: { style: "cursor", has_more: false } });

    await client.users.me();
    await client.v2.workspaces.projects.list("acme");
    expect(v1.isDone()).toBe(true);
    expect(v2.isDone()).toBe(true);
  });

  it("turns Cloudflare Access' sign-in page into a CloudflareAccessError", async () => {
    const page =
      '<!DOCTYPE html><html><a href="https://team.cloudflareaccess.com/cdn-cgi/access/login">Sign in</a></html>';
    const client = new PlaneClient({ baseUrl: BASE, apiKey: "secret" });
    nock(BASE).get("/api/v1/users/me/").reply(200, page, { "Content-Type": "text/html" });
    nock(BASE).get("/api/v2/workspaces/acme/projects/").reply(200, page, { "Content-Type": "text/html" });

    await expect(client.users.me()).rejects.toThrow(CloudflareAccessError);
    await expect(client.v2.workspaces.projects.list("acme")).rejects.toThrow(CloudflareAccessError);
  });

  it("recognises the sign-in page by its body or by where the redirect ended", () => {
    expect(isAccessLoginPage("<html>team.cloudflareaccess.com</html>")).toBe(true);
    expect(isAccessLoginPage({ id: "x" }, "https://team.cloudflareaccess.com/cdn-cgi/access/login/x")).toBe(true);
    expect(isAccessLoginPage({ id: "x" }, `${BASE}/api/v1/users/me/`)).toBe(false);
    expect(isAccessLoginPage("plain text")).toBe(false);
  });
});

describe("PLANE_CF_ACCESS", () => {
  it("is read from the environment or the saved file, and only 'cloudflared' is accepted", () => {
    expect(resolveMcpConfig({ file: { PLANE_CF_ACCESS: "cloudflared" } }).cfAccess).toBe("cloudflared");
    expect(resolveMcpConfig({ env: { PLANE_CF_ACCESS: "cloudflared" } }).cfAccess).toBe("cloudflared");
    expect(resolveMcpConfig({}).cfAccess).toBeUndefined();
    expect(parseCfAccess(" ")).toBeUndefined();
    expect(() => parseCfAccess("token")).toThrow("PLANE_CF_ACCESS must be 'cloudflared'");
  });
});
