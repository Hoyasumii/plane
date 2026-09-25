import { randomBytes, timingSafeEqual } from "node:crypto";
import { IncomingMessage, ServerResponse, createServer } from "node:http";
import { AddressInfo } from "node:net";
import {
  CONFIG_KEYS,
  ConfigKey,
  ConfigValues,
  checkBaseUrl,
  parsePort,
  readEnvFile,
  writeEnvFile,
} from "../../mcp/config";
import { formPage, messagePage, savedPage } from "./config-page";

const MAX_FORM_BYTES = 64 * 1024;
export const CONFIG_UI_TIMEOUT_MS = 10 * 60 * 1000;

export interface ConfigUi {
  /** The page to open, token included. */
  url: string;
  /** Settles once the configuration is saved (`"saved"`) or nobody saved it in time (`"timeout"`). */
  done: Promise<"saved" | "timeout">;
  close(): Promise<void>;
}

function sameToken(given: string | null | undefined, token: string): boolean {
  if (typeof given !== "string") return false;
  const a = Buffer.from(given);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

function send(res: ServerResponse, status: number, html: string, headers: Record<string, string> = {}): void {
  res
    .writeHead(status, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      ...headers,
    })
    .end(html);
}

async function readForm(req: IncomingMessage): Promise<URLSearchParams> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_FORM_BYTES) throw new RangeError("Form too large.");
    chunks.push(chunk as Buffer);
  }
  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}

/** Why `value` cannot be saved as `key`, or `undefined` when it can. Blank values are the caller's concern. */
export function configValueError(key: ConfigKey, value: string): string | undefined {
  if (key === "PLANE_BASE_URL") {
    try {
      checkBaseUrl(value);
    } catch {
      return "PLANE_BASE_URL must be a valid http(s) URL.";
    }
  }
  if (key === "PORT") {
    let port: number | undefined;
    try {
      port = parsePort(value);
    } catch {
      port = undefined;
    }
    if (port === undefined || port === 0) return "PORT must be a number from 1 to 65535.";
  }
  return undefined;
}

/**
 * The configuration to save from what was entered, the form's rules for every front end:
 * a blank key keeps the saved one, other blanks fall back to defaults.
 */
export function valuesFromInput(input: ConfigValues, saved: ConfigValues): { values: ConfigValues; error?: string } {
  const text = (key: ConfigKey): string => (input[key] ?? "").trim();
  const values: ConfigValues = {
    PLANE_API_KEY: text("PLANE_API_KEY") || saved.PLANE_API_KEY,
    PLANE_BASE_URL: text("PLANE_BASE_URL") || undefined,
    PLANE_WORKSPACE: text("PLANE_WORKSPACE") || undefined,
    PORT: text("PORT") || undefined,
  };
  if (!values.PLANE_API_KEY) return { values, error: "PLANE_API_KEY is required." };
  for (const key of CONFIG_KEYS) {
    const error = values[key] ? configValueError(key, values[key] as string) : undefined;
    if (error) return { values, error };
  }
  return { values };
}

/** Validate a submitted form with {@link valuesFromInput}. */
export function valuesFromForm(form: URLSearchParams, saved: ConfigValues): { values: ConfigValues; error?: string } {
  return valuesFromInput(Object.fromEntries(CONFIG_KEYS.map((key) => [key, form.get(key) ?? ""])), saved);
}

/**
 * Serve the configuration form on `127.0.0.1` at a free port until it is saved.
 *
 * A random token in the URL (and in a hidden field) plus a `Host` check keep other web
 * pages from reading the form or posting to it through the browser.
 */
export async function startConfigUi(configFile: string, timeoutMs = CONFIG_UI_TIMEOUT_MS): Promise<ConfigUi> {
  const token = randomBytes(24).toString("hex");
  let port = 0;
  let saved = false;
  let finish: (outcome: "saved" | "timeout") => void = () => undefined;
  const done = new Promise<"saved" | "timeout">((resolve) => {
    finish = resolve;
  });

  const handle = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const host = req.headers.host ?? "";
    if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) {
      send(res, 403, messagePage("Access denied", "Unexpected host."));
      return;
    }
    const url = new URL(req.url ?? "/", `http://${host}`);
    const current = readEnvFile(configFile);

    if (req.method === "GET" && url.pathname === "/") {
      if (!sameToken(url.searchParams.get("t"), token)) {
        send(res, 403, messagePage("Access denied", "Open the link that `plane mcp config` printed."));
        return;
      }
      send(res, 200, formPage({ token, values: current, hasSavedKey: !!current.PLANE_API_KEY, configFile }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/save") {
      let form: URLSearchParams;
      try {
        form = await readForm(req);
      } catch (error) {
        send(res, 413, messagePage("Error", error instanceof Error ? error.message : String(error)));
        return;
      }
      if (!sameToken(form.get("t"), token)) {
        send(res, 403, messagePage("Access denied", "Invalid token."));
        return;
      }
      const { values, error } = valuesFromForm(form, current);
      if (error) {
        send(res, 400, formPage({ token, values, hasSavedKey: !!current.PLANE_API_KEY, configFile, error }));
        return;
      }
      writeEnvFile(configFile, values);
      saved = true;
      res.writeHead(303, { Location: `/saved?t=${token}`, "Cache-Control": "no-store" }).end();
      return;
    }

    if (req.method === "GET" && url.pathname === "/saved" && saved && sameToken(url.searchParams.get("t"), token)) {
      send(res, 200, savedPage(configFile), { Connection: "close" });
      res.on("finish", () => finish("saved"));
      return;
    }

    send(res, 404, messagePage("Not found", "This page does not exist."));
  };

  const server = createServer((req, res) => {
    handle(req, res).catch((error: unknown) => {
      if (!res.headersSent)
        send(res, 500, messagePage("Error", error instanceof Error ? error.message : String(error)));
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  port = (server.address() as AddressInfo).port;

  const timer = setTimeout(() => finish("timeout"), timeoutMs);
  timer.unref();
  const close = (): Promise<void> =>
    new Promise<void>((resolve) => {
      clearTimeout(timer);
      server.closeAllConnections();
      server.close(() => resolve());
    });

  return { url: `http://127.0.0.1:${port}/?t=${token}`, done, close };
}
