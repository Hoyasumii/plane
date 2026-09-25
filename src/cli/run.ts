import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ArgsDef, CommandDef, defineCommand, renderUsage, runCommand } from "citty";
import { DOCS_URL, SERVER_VERSION } from "../mcp/build";
import { configFilePath } from "../mcp/config";
import { ConnectOptions, PlaneMcpConnection, connectPlaneMcp } from "./connect";
import { requireSavedConfig, runMcpCli } from "./mcp";
import { McpDeps, defaultMcpDeps } from "./mcp/deps";
import { CliInputError, ToolInputSchema, argsFromSchema, commandName, toolArguments } from "./schema-args";

export interface CliIo {
  stdout(text: string): void;
  stderr(text: string): void;
  env: Record<string, string | undefined>;
}

/** Connection flags, accepted anywhere on the command line and removed before citty parses the rest. */
const GLOBAL_FLAGS: Record<string, keyof ConnectOptions> = {
  "--url": "url",
  "--base-url": "baseUrl",
  "--api-key": "apiKey",
};

const GLOBAL_ARGS: ArgsDef = {
  url: { type: "string", description: "A running plane-mcp endpoint (env PLANE_MCP_URL). Default: in-process server." },
  "base-url": { type: "string", description: "Plane instance for the in-process server (env PLANE_BASE_URL)." },
  "api-key": { type: "string", description: "Plane API key for the in-process server (env PLANE_API_KEY)." },
};

export function splitGlobalFlags(argv: string[]): { options: ConnectOptions; rest: string[] } {
  const options: ConnectOptions = {};
  const rest: string[] = [];
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    const [flag, inline] = arg.split(/=(.*)/s, 2);
    const key = GLOBAL_FLAGS[flag];
    if (key === undefined) {
      rest.push(arg);
      continue;
    }
    const value = inline ?? argv[++index];
    if (value === undefined) throw new CliInputError(`${flag} needs a value.`);
    options[key] = value;
  }
  return { options, rest };
}

function textOf(content: unknown): string {
  return ((content as { type: string; text?: string }[] | undefined) ?? [])
    .map((part) => (part.type === "text" ? (part.text ?? "") : `[${part.type} content]`))
    .join("\n");
}

function toolCommand(connection: PlaneMcpConnection, tool: Tool, io: CliIo): CommandDef {
  const schema = tool.inputSchema as ToolInputSchema;
  return defineCommand({
    meta: { name: commandName(tool.name), description: tool.description ?? tool.title ?? tool.name },
    args: argsFromSchema(schema),
    async run({ args }) {
      const toolArgs = toolArguments(schema, args);
      if (connection.missing) throw new CliInputError(connection.missing);
      const result = await connection.client.callTool({ name: tool.name, arguments: toolArgs });
      const text = textOf(result.content);
      // The tool's own error text is already the message to show; the outer catch prints it.
      if (result.isError) throw new Error(text);
      io.stdout(text);
    },
  });
}

function buildMain(connection: PlaneMcpConnection, tools: Tool[], io: CliIo): CommandDef {
  const subCommands: Record<string, CommandDef> = {
    tools: defineCommand({
      meta: { name: "tools", description: "List the tools the Plane MCP server offers, as CLI commands." },
      run() {
        const width = Math.max(...tools.map((tool) => commandName(tool.name).length));
        io.stdout(
          tools
            .map((tool) => `${commandName(tool.name).padEnd(width)}  ${tool.title ?? tool.description ?? ""}`)
            .join("\n")
        );
      },
    }),
  };
  for (const tool of tools) subCommands[commandName(tool.name)] = toolCommand(connection, tool, io);
  return defineCommand({
    meta: {
      name: "plane",
      version: SERVER_VERSION,
      description: "Plane from the terminal, through the Plane MCP server's tools.",
    },
    args: GLOBAL_ARGS,
    subCommands: {
      mcp: defineCommand({
        meta: {
          name: "mcp",
          description: "Run and configure the Plane MCP server: start, stop, status, boot, config.",
        },
      }),
      docs: defineCommand({
        meta: { name: "docs", description: `Open the documentation (${DOCS_URL}) in the browser.` },
      }),
      ...subCommands,
    },
  });
}

/** The subcommand the first non-flag argument names, for usage output. */
async function usageFor(main: CommandDef, argv: string[]): Promise<string> {
  const name = argv.find((arg) => !arg.startsWith("-"));
  const subCommands = (main.subCommands ?? {}) as Record<string, CommandDef>;
  const sub = name === undefined ? undefined : subCommands[name];
  return sub ? renderUsage(sub, main) : renderUsage(main);
}

/**
 * Run the `plane` CLI and answer its exit code. Every MCP tool becomes a subcommand
 * (`plane_list_work_items` → `list-work-items`) whose flags come from the tool's input schema;
 * `plane mcp …` manages the server itself (see `./mcp`), and `plane docs` opens the documentation site.
 *
 * The in-process server takes each setting from the flag, then the environment, then the
 * configuration `plane mcp config` saved.
 */
export async function runCli(argv: string[], io: CliIo, deps: Partial<McpDeps> = {}): Promise<number> {
  let connection: PlaneMcpConnection | undefined;
  try {
    const { options, rest } = splitGlobalFlags(argv);
    const commandAt = rest.findIndex((arg) => !arg.startsWith("-"));
    if (rest[commandAt] === "mcp") {
      const mcpArgs = [...rest.slice(0, commandAt), ...rest.slice(commandAt + 1)];
      return await runMcpCli(mcpArgs, options, io, { ...defaultMcpDeps(), ...deps });
    }
    const helpFlag = rest.includes("--help") || rest.includes("-h");
    // Like usage, the documentation needs no saved configuration and no server.
    if (rest[commandAt] === "docs" && !helpFlag) {
      io.stdout(DOCS_URL);
      const openBrowser = deps.openBrowser ?? defaultMcpDeps().openBrowser;
      await openBrowser(DOCS_URL).catch(() => io.stderr("Could not open a browser; open the link above."));
      return 0;
    }
    const wantsUsage = helpFlag || rest.length === 0 || (rest.length === 1 && rest[0] === "--version");
    // Nothing but usage runs before `plane mcp config` has saved a configuration, whatever flags or
    // environment say; the check comes before connecting, so not even `--url` reaches a server.
    const saved = wantsUsage ? {} : requireSavedConfig(configFilePath(io.env, deps.platform));
    connection = await connectPlaneMcp({
      url: options.url ?? io.env.PLANE_MCP_URL,
      baseUrl: options.baseUrl ?? (io.env.PLANE_BASE_URL || saved.PLANE_BASE_URL),
      apiKey: options.apiKey ?? (io.env.PLANE_API_KEY || saved.PLANE_API_KEY),
      workspace: io.env.PLANE_WORKSPACE || saved.PLANE_WORKSPACE,
    });
    const { tools } = await connection.client.listTools();
    const main = buildMain(connection, tools, io);

    if (rest.includes("--help") || rest.includes("-h") || rest.length === 0) {
      io.stdout(await usageFor(main, rest));
      return 0;
    }
    if (rest.length === 1 && rest[0] === "--version") {
      io.stdout(SERVER_VERSION);
      return 0;
    }
    try {
      await runCommand(main, { rawArgs: rest });
      return 0;
    } catch (error) {
      // citty's own usage errors (unknown command, missing required flag); its class is not exported.
      if (error instanceof Error && error.name === "CLIError") {
        io.stderr(`${await usageFor(main, rest)}\n\n${error.message}`);
        return 1;
      }
      throw error;
    }
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  } finally {
    await connection?.close();
  }
}
