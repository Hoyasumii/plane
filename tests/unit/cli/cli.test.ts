import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import nock from "nock";
import { McpDeps } from "../../../src/cli/mcp/deps";
import { runCli, splitGlobalFlags } from "../../../src/cli/run";
import { RunningPlaneMcpServer, startPlaneMcpServer } from "../../../src/mcp";
import { writeEnvFile } from "../../../src/mcp/config";

const BASE = "https://api.example.com";

let home: string;
let configFile: string;
let running: RunningPlaneMcpServer | undefined;
beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "plane-cli-"));
  configFile = path.join(home, ".env");
  writeEnvFile(configFile, { PLANE_API_KEY: "saved", PLANE_BASE_URL: BASE });
});
afterEach(async () => {
  nock.cleanAll();
  await running?.close();
  running = undefined;
  fs.rmSync(home, { recursive: true, force: true });
});

async function cli(argv: string[], env: Record<string, string | undefined> = {}, deps: Partial<McpDeps> = {}) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCli(
    argv,
    {
      stdout: (text) => out.push(text),
      stderr: (text) => err.push(text),
      // Never the developer's own saved configuration.
      env: { PLANE_CONFIG: configFile, ...env },
    },
    deps
  );
  return { code, stdout: out.join("\n"), stderr: err.join("\n") };
}

describe("plane CLI", () => {
  it("refuses every command until `plane mcp config` has saved a configuration", async () => {
    fs.rmSync(configFile);
    running = await startPlaneMcpServer({ port: 0, baseUrl: BASE, apiKey: "server-key" });
    for (const argv of [
      ["tools"],
      ["whoami"],
      ["whoami", "--api-key", "k"],
      ["whoami", "--url", running.url],
      ["mcp", "stop"],
      ["mcp", "status"],
      ["mcp", "boot", "status"],
    ]) {
      const result = await cli(argv, { PLANE_API_KEY: "from-env", PLANE_BASE_URL: BASE });
      expect({ argv, code: result.code }).toEqual({ argv, code: 1 });
      expect(result.stderr).toContain(`No saved configuration at ${configFile}: run \`plane mcp config\` first.`);
      expect(result.stdout).toBe("");
    }
  });

  it("still prints help and the version before anything is configured", async () => {
    fs.rmSync(configFile);
    for (const argv of [[], ["--help"], ["whoami", "--help"], ["mcp"], ["mcp", "config", "--help"], ["--version"]]) {
      const result = await cli(argv);
      expect({ argv, code: result.code, stderr: result.stderr }).toEqual({ argv, code: 0, stderr: "" });
    }
  });

  it("opens the documentation site with `plane docs`, configured or not", async () => {
    fs.rmSync(configFile);
    const opened: string[] = [];
    const result = await cli(["docs"], {}, { openBrowser: async (url) => void opened.push(url) });
    expect(result).toEqual({ code: 0, stdout: "https://hoyasumii.github.io/plane/", stderr: "" });
    expect(opened).toEqual(["https://hoyasumii.github.io/plane/"]);
  });

  it("still prints the link when `plane docs` cannot open a browser", async () => {
    const result = await cli(["docs"], {}, { openBrowser: () => Promise.reject(new Error("no browser")) });
    expect(result).toEqual({
      code: 0,
      stdout: "https://hoyasumii.github.io/plane/",
      stderr: "Could not open a browser; open the link above.",
    });
  });

  it("describes `plane docs` in the usage without opening anything", async () => {
    const opened: string[] = [];
    const openBrowser = async (url: string) => void opened.push(url);
    expect((await cli(["--help"], {}, { openBrowser })).stdout).toMatch(/`docs`\s+Open the documentation/);
    expect((await cli(["docs", "--help"], {}, { openBrowser })).code).toBe(0);
    expect(opened).toEqual([]);
  });

  it("refuses a saved configuration that has no API key", async () => {
    writeEnvFile(configFile, { PLANE_BASE_URL: BASE });
    const result = await cli(["tools"], { PLANE_API_KEY: "from-env" });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("run `plane mcp config` first");
  });

  it("lists the MCP tools as commands once configured", async () => {
    const result = await cli(["tools"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/^whoami\s+Current Plane user$/m);
    expect(result.stdout).toMatch(/^list-work-items\s+/m);
    expect(result.stdout).toMatch(/^call\s+/m);
  });

  it("runs a tool in-process with the key from the environment", async () => {
    const scope = nock(BASE, { reqheaders: { "x-api-key": "secret" } })
      .get("/api/v1/users/me/")
      .reply(200, { id: "u1", display_name: "Ada" })
      .get("/api/v2/users/me/")
      .reply(404, { detail: "Not found." });
    const result = await cli(["whoami"], { PLANE_BASE_URL: BASE, PLANE_API_KEY: "secret" });
    expect(result).toMatchObject({ code: 0, stderr: "" });
    expect(result.stdout).toContain('"display_name": "Ada"');
    expect(scope.isDone()).toBe(true);
  });

  it("coerces flags into the tool's arguments", async () => {
    const scope = nock(BASE)
      .get("/api/v2/users/me/")
      .reply(200, { id: "u1" })
      .get("/api/v2/workspaces/acme/work-items/")
      .query({ per_page: "5", search: "core" })
      .reply(200, { data: [{ id: "w1" }], pagination: { style: "offset" } });
    const result = await cli(["list-work-items", "--slug", "acme", "--per-page", "5", "--search=core"], {
      PLANE_BASE_URL: BASE,
      PLANE_API_KEY: "secret",
    });
    expect(result.stderr).toBe("");
    expect(result.code).toBe(0);
    expect(scope.isDone()).toBe(true);
  });

  it("uses the saved API key when no flag or environment variable overrides it", async () => {
    const scope = nock(BASE, { reqheaders: { "x-api-key": "saved" } })
      .get("/api/v1/users/me/")
      .reply(200, { id: "u1", display_name: "Ada" })
      .get("/api/v2/users/me/")
      .reply(404, { detail: "Not found." });
    const result = await cli(["whoami"]);
    expect(result).toMatchObject({ code: 0, stderr: "" });
    expect(scope.isDone()).toBe(true);
  });

  it("reports tool errors on stderr with exit code 1", async () => {
    nock(BASE).get("/api/v2/users/me/").reply(200, { id: "u1" });
    const result = await cli(
      [
        "call",
        "--resource",
        "workspaces.projects.cycles",
        "--method",
        "delete",
        "--args",
        '{"slug":"acme","project":"p1","cycle":"c1"}',
      ],
      { PLANE_BASE_URL: BASE, PLANE_API_KEY: "secret" }
    );
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("is destructive; call again with confirm: true");
  });

  it("prints usage for a missing required flag or an unknown command", async () => {
    const missing = await cli(["get-issue"], { PLANE_API_KEY: "secret" });
    expect(missing.code).toBe(1);
    expect(missing.stderr).toContain("Missing required argument: --key");
    expect(missing.stderr).toContain("USAGE");

    const unknown = await cli(["nope"], { PLANE_API_KEY: "secret" });
    expect(unknown.code).toBe(1);
    expect(unknown.stderr).toContain("Unknown command `nope`");
  });

  it("connects to a running plane-mcp with --url", async () => {
    running = await startPlaneMcpServer({ port: 0, baseUrl: BASE, apiKey: "server-key" });
    const scope = nock(BASE, { reqheaders: { "x-api-key": "server-key" } })
      .get("/api/v1/users/me/")
      .reply(200, { id: "u1", display_name: "Grace" })
      .get("/api/v2/users/me/")
      .reply(404, { detail: "Not found." });
    const result = await cli(["whoami", "--url", running.url]);
    expect(result).toMatchObject({ code: 0, stderr: "" });
    expect(result.stdout).toContain('"display_name": "Grace"');
    expect(scope.isDone()).toBe(true);
  });

  it("takes the connection flags from anywhere on the line", () => {
    expect(splitGlobalFlags(["--url=http://x/mcp", "whoami", "--api-key", "k", "--slug", "a"])).toEqual({
      options: { url: "http://x/mcp", apiKey: "k" },
      rest: ["whoami", "--slug", "a"],
    });
    expect(() => splitGlobalFlags(["whoami", "--base-url"])).toThrow("--base-url needs a value.");
  });
});
