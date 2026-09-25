import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  configDir,
  configFilePath,
  parseEnv,
  readEnvFile,
  resolveMcpConfig,
  stateDir,
  writeEnvFile,
} from "../../../src/mcp/config";

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "plane-config-"));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("config locations", () => {
  it("uses the per-user config directory of each platform", () => {
    expect(configDir({ HOME: "/home/ada" }, "linux")).toBe("/home/ada/.config/plane");
    expect(configDir({ HOME: "/home/ada", XDG_CONFIG_HOME: "/xdg" }, "linux")).toBe("/xdg/plane");
    expect(configDir({ HOME: "/Users/ada" }, "darwin")).toBe("/Users/ada/Library/Application Support/plane");
    expect(configDir({ APPDATA: "C:\\Users\\ada\\AppData\\Roaming" }, "win32")).toBe(
      "C:\\Users\\ada\\AppData\\Roaming\\plane"
    );
  });

  it("puts the .env in it unless PLANE_CONFIG says otherwise", () => {
    expect(configFilePath({ HOME: "/home/ada" }, "linux")).toBe("/home/ada/.config/plane/.env");
    expect(configFilePath({ APPDATA: "C:\\AppData" }, "win32")).toBe("C:\\AppData\\plane\\.env");
    expect(configFilePath({ HOME: "/home/ada", PLANE_CONFIG: "/etc/x.env" }, "linux")).toBe(path.resolve("/etc/x.env"));
    expect(stateDir("/home/ada/.config/plane/.env")).toBe(path.join("/home/ada/.config/plane", "run"));
  });

  it("builds each platform's path with that platform's separators, whatever OS runs it", () => {
    expect(configDir({ HOME: "/home/ada" }, "linux")).toBe("/home/ada/.config/plane");
    expect(configDir({ HOME: "/Users/ada" }, "darwin")).toBe("/Users/ada/Library/Application Support/plane");
    expect(configDir({ APPDATA: "C:\\Users\\ada\\AppData\\Roaming" }, "win32")).toBe(
      "C:\\Users\\ada\\AppData\\Roaming\\plane"
    );
    expect(configFilePath({ HOME: "/home/ada", PLANE_CONFIG: "/etc/x.env" }, "linux")).toBe(path.resolve("/etc/x.env"));
  });
});

describe(".env files", () => {
  it("parses comments, export, quotes and inline comments", () => {
    expect(
      parseEnv(
        [
          "# comment",
          "",
          "export PLANE_API_KEY=abc",
          'PLANE_BASE_URL="https://x.test" ',
          "PLANE_WORKSPACE='acme # not a comment'",
          "PORT=4000 # inline",
          "not a line",
        ].join("\n")
      )
    ).toEqual({
      PLANE_API_KEY: "abc",
      PLANE_BASE_URL: "https://x.test",
      PLANE_WORKSPACE: "acme # not a comment",
      PORT: "4000",
    });
  });

  it("reads a missing file as empty and keeps only the known, non-empty keys", () => {
    const file = path.join(dir, ".env");
    expect(readEnvFile(file)).toEqual({});
    fs.writeFileSync(file, "PLANE_API_KEY=k\nPLANE_WORKSPACE=\nOTHER=1\n");
    expect(readEnvFile(file)).toEqual({ PLANE_API_KEY: "k" });
  });

  it("writes an owner-only file that reads back the same", () => {
    const file = path.join(dir, "nested", ".env");
    const values = { PLANE_API_KEY: 'a"b\\c d', PLANE_BASE_URL: "https://x.test", PORT: "4000" };
    writeEnvFile(file, values);
    expect(readEnvFile(file)).toEqual(values);
    if (process.platform !== "win32") expect(fs.statSync(file).mode & 0o777).toBe(0o600);
    expect(fs.readdirSync(path.dirname(file))).toEqual([".env"]);
  });
});

describe("resolveMcpConfig", () => {
  const file = { PLANE_API_KEY: "file", PLANE_BASE_URL: "https://file.test", PLANE_WORKSPACE: "f", PORT: "1111" };

  it("takes flag over environment over file over default", () => {
    expect(resolveMcpConfig({})).toEqual({
      apiKey: "",
      baseUrl: "https://api.plane.so",
      workspace: undefined,
      port: 3766,
    });
    expect(resolveMcpConfig({ file })).toEqual({
      apiKey: "file",
      baseUrl: "https://file.test",
      workspace: "f",
      port: 1111,
    });
    expect(resolveMcpConfig({ file, env: { PLANE_API_KEY: "env", PORT: "2222", PLANE_WORKSPACE: "" } })).toMatchObject({
      apiKey: "env",
      port: 2222,
      workspace: "f",
    });
    expect(
      resolveMcpConfig({ file, env: { PLANE_API_KEY: "env" }, flags: { apiKey: "flag", workspace: "w", port: "0" } })
    ).toMatchObject({ apiKey: "flag", workspace: "w", port: 0 });
  });

  it("refuses a bad port or base URL", () => {
    expect(() => resolveMcpConfig({ flags: { port: "70000" } })).toThrow("PORT must be an integer");
    expect(() => resolveMcpConfig({ flags: { port: "12a" } })).toThrow("PORT must be an integer");
    expect(() => resolveMcpConfig({ flags: { baseUrl: "ftp://x" } })).toThrow("PLANE_BASE_URL is not a valid");
  });
});
