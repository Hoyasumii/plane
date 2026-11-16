import { execFileSync } from "node:child_process";
import { CloudflareAccessError } from "../errors/CloudflareAccessError";

/** Runs `cloudflared` with these arguments and returns its stdout. */
export type CloudflaredRunner = (args: string[]) => string;

const defaultRunner: CloudflaredRunner = (args) =>
  execFileSync("cloudflared", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 15_000 });

/** A token is renewed this long before the `exp` it carries. */
const RENEW_MARGIN_MS = 60_000;

/** The `exp` of a JWT, in milliseconds, or `undefined` when it cannot be read. */
function expiresAt(token: string): number | undefined {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"));
    return typeof payload.exp === "number" ? payload.exp * 1000 : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Headers for a Plane instance behind Cloudflare Access, from the token `cloudflared` holds for
 * the signed-in user (`cloudflared access login <appUrl>`): `cf-access-token: <token>`.
 *
 * The token is cached until shortly before it expires; a missing or expired login throws a
 * {@link CloudflareAccessError} that says which command to run.
 */
export function cloudflaredAccessHeaders(
  appUrl: string,
  options: { run?: CloudflaredRunner; now?: () => number } = {}
): () => Record<string, string> {
  const run = options.run ?? defaultRunner;
  const now = options.now ?? Date.now;
  const loginHint = `run \`cloudflared access login ${appUrl}\``;
  let cached: { token: string; expires?: number } | undefined;

  return () => {
    if (cached && (cached.expires === undefined || cached.expires - RENEW_MARGIN_MS > now())) {
      return { "cf-access-token": cached.token };
    }
    let output: string;
    try {
      output = run(["access", "token", `-app=${appUrl}`]);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        throw new CloudflareAccessError(
          `PLANE_CF_ACCESS=cloudflared, but \`cloudflared\` is not installed or not on PATH. Install it, then ${loginHint}.`
        );
      }
      throw new CloudflareAccessError(`Could not get a Cloudflare Access token from cloudflared: ${loginHint}.`);
    }
    const token = output.trim().split(/\s+/).pop() ?? "";
    const expires = expiresAt(token);
    if (!token.includes(".") || (expires !== undefined && expires <= now())) {
      throw new CloudflareAccessError(`No valid Cloudflare Access token for ${appUrl}: ${loginHint}.`);
    }
    cached = { token, expires };
    return { "cf-access-token": token };
  };
}

/**
 * Whether a response is Cloudflare Access' sign-in page instead of the API's answer: the
 * request never reached Plane.
 */
export function isAccessLoginPage(data: unknown, finalUrl?: string): boolean {
  if (finalUrl && /\.cloudflareaccess\.com\//.test(finalUrl)) return true;
  return typeof data === "string" && /<html/i.test(data) && /cloudflareaccess\.com/.test(data);
}

/** The error for a request Cloudflare Access turned away. */
export function accessLoginError(): CloudflareAccessError {
  return new CloudflareAccessError(
    "Cloudflare Access answered with its sign-in page: the request never reached Plane. " +
      "Set PLANE_CF_ACCESS=cloudflared in the Plane MCP configuration and run `cloudflared access login <PLANE_BASE_URL>` " +
      "(or renew that login if it expired)."
  );
}
