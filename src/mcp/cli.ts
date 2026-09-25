#!/usr/bin/env node
/**
 * `plane-mcp`: run the MCP server in the foreground — over stdio by default, the way an MCP
 * client launches it, or over Streamable HTTP with `--http`.
 *
 *   plane-mcp                                   # stdio: the client spawns this and talks on stdin/stdout
 *   PORT=3766 plane-mcp --http                  # http://127.0.0.1:3766/mcp
 *
 * Anything the environment leaves out comes from the saved configuration
 * (`plane mcp config`), then the defaults.
 */
import { configFilePath, readEnvFile, resolveMcpConfig } from "./config";
import { startPlaneMcpServer } from "./server";
import { servePlaneMcpStdio } from "./stdio";

export type PlaneMcpMode = "stdio" | "http" | "help";

const USAGE = `Usage: plane-mcp [--stdio | --http] [--help]

Run the Plane MCP server in the foreground.

  --stdio   Speak MCP on stdin/stdout, for a client that launches the server (default).
  --http    Serve Streamable HTTP at http://127.0.0.1:<PORT>/mcp (PORT defaults to 3766).
  --help    Show this help.

Settings come from the environment (PLANE_API_KEY, PLANE_BASE_URL, PLANE_WORKSPACE, PORT),
then the configuration saved by \`plane mcp config\`, then the defaults.
`;

/** The transport the arguments ask for. `--help` wins over everything else. */
export function parsePlaneMcpArgs(argv: readonly string[]): { mode: PlaneMcpMode } {
  const known = new Set(["--stdio", "--http", "--help", "-h"]);
  for (const arg of argv) {
    if (!known.has(arg)) throw new TypeError(`Unknown argument '${arg}'.\n\n${USAGE}`);
  }
  if (argv.includes("--help") || argv.includes("-h")) return { mode: "help" };
  if (argv.includes("--stdio") && argv.includes("--http")) {
    throw new TypeError(`Choose either --stdio or --http, not both.\n\n${USAGE}`);
  }
  return { mode: argv.includes("--http") ? "http" : "stdio" };
}

async function main(): Promise<void> {
  const { mode } = parsePlaneMcpArgs(process.argv.slice(2));
  if (mode === "help") {
    process.stdout.write(USAGE);
    return;
  }
  const config = resolveMcpConfig({ env: process.env, file: readEnvFile(configFilePath(process.env)) });
  if (!config.apiKey) {
    throw new TypeError(
      `No Plane API key. Set PLANE_API_KEY or save one with \`plane mcp config\` (${configFilePath(process.env)}).`
    );
  }

  if (mode === "stdio") {
    const server = await servePlaneMcpStdio(config);
    // stdout is the protocol channel: everything else goes to stderr.
    // oxlint-disable-next-line no-console
    console.error("Plane MCP server running on stdio");
    await server.closed;
    process.exit(0);
  }

  const server = await startPlaneMcpServer(config);
  // oxlint-disable-next-line no-console -- stderr is the only channel a CLI has
  console.error(`Plane MCP server listening on ${server.url}`);
  const stop = (): void => {
    void server.close().then(() => process.exit(0));
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

if (require.main === module) {
  main().catch((error: unknown) => {
    // oxlint-disable-next-line no-console
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
