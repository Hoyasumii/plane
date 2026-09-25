import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { renameWithRetry } from "./fs-util";

/** The keys the saved configuration holds, in the order they are written. */
export const CONFIG_KEYS = ["PLANE_API_KEY", "PLANE_BASE_URL", "PLANE_WORKSPACE", "PORT"] as const;
export type ConfigKey = (typeof CONFIG_KEYS)[number];
export type ConfigValues = Partial<Record<ConfigKey, string>>;

export const DEFAULT_BASE_URL = "https://api.plane.so";
export const DEFAULT_PORT = 3766;

type Env = Record<string, string | undefined>;

function homeOf(env: Env): string {
  return env.HOME || env.USERPROFILE || os.homedir();
}

/**
 * The per-user directory the saved configuration lives in: `$XDG_CONFIG_HOME/plane`
 * (`~/.config/plane`) on Linux, `~/Library/Application Support/plane` on macOS and
 * `%APPDATA%\plane` on Windows. Built with `platform`'s own path flavour, not the host's.
 */
export function configDir(env: Env = process.env, platform: NodeJS.Platform = process.platform): string {
  if (platform === "win32") {
    const appData = env.APPDATA || path.win32.join(homeOf(env), "AppData", "Roaming");
    return path.win32.join(appData, "plane");
  }
  const posix = path.posix;
  if (platform === "darwin") return posix.join(homeOf(env), "Library", "Application Support", "plane");
  return posix.join(env.XDG_CONFIG_HOME || posix.join(homeOf(env), ".config"), "plane");
}

/** The saved `.env`: `PLANE_CONFIG` when set, otherwise `<configDir>/.env`. */
export function configFilePath(env: Env = process.env, platform: NodeJS.Platform = process.platform): string {
  const flavour = platform === "win32" ? path.win32 : path.posix;
  // PLANE_CONFIG names a file this process opens, so it resolves against the host, not `platform`.
  if (env.PLANE_CONFIG) return path.resolve(env.PLANE_CONFIG);
  return flavour.join(configDir(env, platform), ".env");
}

/** Where a running server's pid file and log go: `run/` beside the saved `.env`. */
export function stateDir(configFile: string): string {
  return path.join(path.dirname(configFile), "run");
}

function unquote(value: string): string {
  const quote = value[0];
  if ((quote === '"' || quote === "'") && value.endsWith(quote) && value.length >= 2) {
    const inner = value.slice(1, -1);
    return quote === '"' ? inner.replace(/\\n/g, "\n").replace(/\\(["\\])/g, "$1") : inner;
  }
  return value.replace(/\s+#.*$/, "");
}

/** `KEY=VALUE` lines, `#` comments and quoted values. Every key is kept, known or not. */
export function parseEnv(text: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (match) values[match[1]] = unquote(match[2].trim());
  }
  return values;
}

/** The saved configuration, or `{}` when there is no file yet. */
export function readEnvFile(file: string): ConfigValues {
  let text: string;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
  const parsed = parseEnv(text);
  const values: ConfigValues = {};
  for (const key of CONFIG_KEYS) if (parsed[key] !== undefined && parsed[key] !== "") values[key] = parsed[key];
  return values;
}

function quote(value: string): string {
  return /^[\w.:/@+-]*$/.test(value) ? value : `"${value.replace(/(["\\])/g, "\\$1").replace(/\n/g, "\\n")}"`;
}

/** Write the four keys, readable by the owner only, replacing the file in one rename. */
export function writeEnvFile(file: string, values: ConfigValues): void {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const body =
    "# Plane MCP server configuration, written by `plane mcp config`.\n" +
    CONFIG_KEYS.filter((key) => values[key])
      .map((key) => `${key}=${quote(values[key] as string)}\n`)
      .join("");
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, body, { mode: 0o600 });
  renameWithRetry(temporary, file);
  fs.chmodSync(file, 0o600);
}

export interface McpConfigFlags {
  apiKey?: string;
  baseUrl?: string;
  workspace?: string;
  port?: string | number;
}

export interface McpConfig {
  /** `""` when no source gave one. */
  apiKey: string;
  baseUrl: string;
  workspace?: string;
  port: number;
}

/** Parse and range-check a port; `0` means "pick a free one". */
export function parsePort(value: string | number): number {
  const port = typeof value === "number" ? value : /^\d+$/.test(value.trim()) ? Number(value) : Number.NaN;
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new RangeError(`PORT must be an integer from 0 to 65535 (received '${String(value)}').`);
  }
  return port;
}

export function checkBaseUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new TypeError();
  } catch {
    throw new TypeError(`PLANE_BASE_URL is not a valid http(s) URL: '${value}'.`);
  }
  return value;
}

/**
 * The server's settings, each from the first source that has it:
 * **flag > process environment > saved `.env` > default**.
 */
export function resolveMcpConfig(sources: { flags?: McpConfigFlags; env?: Env; file?: ConfigValues }): McpConfig {
  const { flags = {}, env = {}, file = {} } = sources;
  const pick = (flag: string | number | undefined, key: ConfigKey): string | undefined => {
    for (const value of [flag, env[key], file[key]]) {
      const text = value === undefined ? "" : String(value).trim();
      if (text !== "") return text;
    }
    return undefined;
  };
  return {
    apiKey: pick(flags.apiKey, "PLANE_API_KEY") ?? "",
    baseUrl: checkBaseUrl(pick(flags.baseUrl, "PLANE_BASE_URL") ?? DEFAULT_BASE_URL),
    workspace: pick(flags.workspace, "PLANE_WORKSPACE"),
    port: parsePort(pick(flags.port, "PORT") ?? DEFAULT_PORT),
  };
}
