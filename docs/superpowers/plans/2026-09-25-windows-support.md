# Windows Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `@hoyasumii/plane` (SDK, `plane-mcp`, the `plane` CLI and every `plane mcp`
subcommand) work on native Windows, and let `plane mcp install`/`uninstall` running inside WSL
reach the clients installed on the Windows side.

**Architecture:** Spawning moves to `cross-spawn` behind `McpDeps`, the only process boundary.
`stop` shuts the daemon down through a token-guarded `POST /shutdown` instead of relying on
signals. `install`/`uninstall` iterate over _hosts × clients_. A `ClientHost` knows a home
directory, how to find and run a client CLI, and how a client on that host launches the server.
The `native` host is always present. The `windows` host appears only inside WSL and talks to
Windows through `powershell.exe -EncodedCommand` and `wslpath`.

**Tech Stack:** TypeScript 5.9 (CommonJS build), Node ≥ 20, pnpm 11, Jest + ts-jest, citty 0.1,
`cross-spawn` 7, `jsonc-parser` 3, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-25-windows-support-design.md`. Read it before starting:
the "Facts this design rests on" section explains every non-obvious choice below.

## Global Constraints

- Node `>=20.0.0` (package.json `engines`). The build is CommonJS, so no ESM-only dependency may
  be added. That is why citty is pinned to 0.1.
- Windows target: Windows PowerShell **5.1** (no PowerShell 7-only syntax), Windows 10/11.
- WSL bridge: the distro name comes from `WSL_DISTRO_NAME`. Paths cross the boundary only
  through `wslpath -u`.
- Every OS call goes through `McpDeps` (`src/cli/mcp/deps.ts`); nothing else imports
  `child_process` or `cross-spawn`.
- UI text is English. File names are kebab-case, classes PascalCase, methods camelCase. Never
  write "Issue" in a name; it is always "Work Item".
- Formatting: oxfmt at 120 columns (`pnpm fix:format`). Lint: oxlint, with 0 errors.
- Registered client entries are named `plane` and are user/global scope only.
- `plane mcp uninstall` and `plane mcp config` are the only `plane` commands that run without a
  saved configuration.
- Repository rule: every new guard is proven by introducing the violation, watching the test fail
  by name, and reverting.
- Commits: the repository instructions say to commit only when the user asks. Before the first
  commit in Task 0, confirm with the user; after that, the per-task commits below are the agreed
  cadence.

## Review Focus

1. **A Windows user name with spaces, accents or an apostrophe** (`C:\Users\João O'Brien`): the
   home, the located `.exe` and the arguments passed to a `.cmd` keep every character. This is
   pinned in Task 7 (probe JSON with `João O'Brien`, `psQuote` doubling `'`).
2. **WSL without working interop** (no `powershell.exe`, or it exits non-zero): the `windows` host
   is silently absent and `install` still shows the native rows. `--client claude@windows` then
   fails saying the Windows side is unreachable from WSL. This is pinned in Task 7.
3. **A client CLI that hangs on `--version`** (first-run prompt, broken shim): `find` gives up
   after 10 s and the client shows as `not found` instead of hanging `install`. This is pinned in
   Task 6 (`find` passes `{ timeoutMs: 10_000 }`) and Task 2 (the timeout itself).
4. **A state file written by the previous version** (no `shutdownToken`): `stop` goes straight to
   `kill`, prints nothing on stderr and still succeeds. This is pinned in Task 4 (an extra
   assertion on the existing test).
5. **Another local process calling `/shutdown`** without the token, or with a wrong one: 403,
   and the server keeps running. This is pinned in Task 4.

---

## File structure

| File                                                                                                                                 | Status | Responsibility                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------ | -------------------------------------------------------------------------------------------------- |
| `.gitattributes`                                                                                                                     | create | LF everywhere, so Windows checkouts pass `check:format` and keep shebangs                          |
| `package.json`                                                                                                                       | modify | `clean` script without `rm -rf`; `cross-spawn` + `@types/cross-spawn`                              |
| `src/cli/mcp/deps.ts`                                                                                                                | modify | `exec`/`spawn` on `cross-spawn`; `exec` timeout; new `exit()` and `isWsl()`                        |
| `src/mcp/fs-util.ts`                                                                                                                 | create | `renameWithRetry` for Windows file locks                                                           |
| `src/mcp/config.ts`                                                                                                                  | modify | `path.posix`/`path.win32` chosen by the `platform` argument; `writeEnvFile` uses `renameWithRetry` |
| `src/mcp/server.ts`                                                                                                                  | modify | `shutdownToken`/`onShutdown` options and the `POST /shutdown` route                                |
| `src/cli/mcp/daemon.ts`                                                                                                              | modify | token in the state file; `stopServer` tries the graceful path first                                |
| `src/cli/mcp/hosts.ts`                                                                                                               | create | `ClientHost`, `nativeHost`, `windowsHost`, `detectHosts`                                           |
| `src/cli/mcp/install.ts`                                                                                                             | modify | detection is host × client; steps run through the host                                             |
| `src/cli/mcp/index.ts`                                                                                                               | modify | wiring: hosts, `--client x@windows`, `(Windows)` labels, `stop` fallback message                   |
| `.github/workflows/build-test.yaml`                                                                                                  | modify | `ubuntu-latest` + `windows-latest` matrix                                                          |
| `README.md`, `CLAUDE.md`                                                                                                             | modify | Windows section; architecture notes                                                                |
| `tests/unit/cli/deps.test.ts`                                                                                                        | create | real `exec` behaviour (127, arguments, timeout, `.cmd` on win32)                                   |
| `tests/unit/mcp/fs-util.test.ts`                                                                                                     | create | `renameWithRetry`                                                                                  |
| `tests/unit/cli/hosts.test.ts`                                                                                                       | create | `nativeHost` and `windowsHost` with fake OS answers                                                |
| `tests/unit/mcp/server.test.ts`, `tests/unit/cli/mcp.test.ts`, `tests/unit/cli/mcp-install.test.ts`, `tests/unit/mcp/config.test.ts` | modify | new cases; platform-neutral paths                                                                  |

---

### Task 0: Branch and baseline

**Files:** none changed; this task puts the existing uncommitted work on a branch.

- [ ] **Step 1: Ask the user to confirm committing**

The working tree on `main` holds the uncommitted MCP server, CLI, install/uninstall and stdio
work. Ask: "May I create `feat/windows-support` and commit the current work as the baseline?"
Stop until they answer yes.

- [ ] **Step 2: Branch and commit the baseline**

```bash
git switch -c feat/windows-support
git add -A
git commit -m "feat: MCP server (stdio + HTTP), plane CLI, mcp install/uninstall"
```

- [ ] **Step 3: Verify the baseline is green**

Run: `pnpm build && pnpm test:unit && pnpm check:lint && pnpm check:format`
Expected: build ends with `check-types-bundle: … matches the snapshot`; `Tests: … passed` with 0
failed; lint `0 errors`; format `All matched files use the correct format.`

---

### Task 1: Line endings and the `clean` script

**Files:**

- Create: `.gitattributes`
- Modify: `package.json` (`scripts.clean`)

**Interfaces:** none.

- [ ] **Step 1: Write `.gitattributes`**

```gitattributes
# Keep LF on every platform: oxfmt checks LF, and a CRLF shebang breaks `#!/usr/bin/env node`.
* text=auto eol=lf
# Files Windows itself executes keep CRLF, should any ever be committed.
*.cmd text eol=crlf
*.bat text eol=crlf
*.vbs text eol=crlf
```

- [ ] **Step 2: Check nothing in the tree changes under the new rules**

Run: `git add --renormalize . && git status --short`
Expected: only `.gitattributes` appears as new. If any other file shows as modified, it had CRLF
endings: keep the renormalized version, since LF is what oxfmt expects.

- [ ] **Step 3: Replace the `clean` script**

In `package.json`, change

```json
    "clean": "rm -rf dist && rm -rf node_modules",
```

to

```json
    "clean": "node -e \"for (const dir of ['dist', 'node_modules']) require('fs').rmSync(dir, { recursive: true, force: true })\"",
```

The other scripts (`build`, `test*`, `check:*`, `codegen:*`, `mcp`, `cli`) were checked while
writing this plan. They use only `node`, `tsc`, `jest`, `oxlint`, `oxfmt`, `ts-node` and `&&`,
which work in cmd and PowerShell too. `clean` was the only POSIX-only one.

- [ ] **Step 4: Verify the script runs**

Run: `pnpm clean && ls dist node_modules 2>&1 | head -2; pnpm install --frozen-lockfile && pnpm build`
Expected: `ls` reports both missing; install and build succeed again.

- [ ] **Step 5: Commit**

```bash
git add .gitattributes package.json
git commit -m "chore: LF line endings everywhere and a cross-platform clean script"
```

---

### Task 2: `exec`/`spawn` on `cross-spawn`, with a timeout

**Files:**

- Modify: `package.json`, `pnpm-lock.yaml` (dependencies)
- Modify: `src/cli/mcp/deps.ts`
- Test: `tests/unit/cli/deps.test.ts` (create)

**Interfaces:**

- Produces: `McpDeps.exec(command: string, args: string[], options?: ExecOptions): Promise<ExecResult>`,
  with `export interface ExecOptions { timeoutMs?: number }`. Exit code 127 means "no such
  command"; 124 means "timed out". `McpDeps.spawn` has the same signature as today, implemented
  with `cross-spawn`.

- [ ] **Step 1: Add the dependency**

Run: `pnpm add cross-spawn@^7.0.6 && pnpm add -D @types/cross-spawn@^6.0.6`
Expected: both appear in `package.json`; `node -e "require('cross-spawn')"` exits 0.

- [ ] **Step 2: Write the failing tests**

Create `tests/unit/cli/deps.test.ts`:

```ts
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { defaultMcpDeps } from "../../../src/cli/mcp/deps";

const ECHO_ARGS = "process.stdout.write(JSON.stringify(process.argv.slice(1)))";
const onWindows = process.platform === "win32" ? it : it.skip;

describe("defaultMcpDeps().exec", () => {
  const { exec } = defaultMcpDeps();

  it("answers 127 for a command that does not exist", async () => {
    const result = await exec(`plane-no-such-command-${process.pid}`, ["--version"]);
    expect(result.code).toBe(127);
  });

  it("passes arguments with spaces, quotes and shell metacharacters through intact", async () => {
    const result = await exec(process.execPath, ["-e", ECHO_ARGS, "a b", 'c"d', "e&f"]);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(["a b", 'c"d', "e&f"]);
  });

  it("gives up after timeoutMs with code 124", async () => {
    const started = Date.now();
    const result = await exec(process.execPath, ["-e", "setTimeout(() => {}, 30000)"], { timeoutMs: 300 });
    expect(result.code).toBe(124);
    expect(Date.now() - started).toBeLessThan(5000);
  });

  onWindows("runs a .cmd shim, which plain execFile refuses since Node 20.12", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "plane-deps-"));
    const shim = path.join(dir, "echo-args.cmd");
    fs.writeFileSync(shim, `@"${process.execPath}" -e "${ECHO_ARGS}" %*\r\n`);
    try {
      const result = await exec(shim, ["a b", "e&f"]);
      expect(result.code).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual(["a b", "e&f"]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 3: Run the tests and verify they fail**

Run: `pnpm test tests/unit/cli/deps.test.ts`
Expected: FAIL. `gives up after timeoutMs with code 124` fails with a Jest timeout, because
`exec` ignores the options today. On Linux the `.cmd` test is skipped.

- [ ] **Step 4: Implement**

In `src/cli/mcp/deps.ts`:

1. Replace the `node:child_process` import line with:

```ts
import { ChildProcess, SpawnOptions } from "node:child_process";
import crossSpawn from "cross-spawn";
```

2. Add after the `ExecResult` interface:

```ts
export interface ExecOptions {
  /** Kill the command and answer code 124 when it runs longer than this. */
  timeoutMs?: number;
}
```

3. In `interface McpDeps`, change the `exec` member to:

```ts
  /**
   * Run a command to completion through `cross-spawn`, so `.cmd`/`.bat` shims work on Windows.
   * Never throws: a missing binary answers code 127, a timeout 124.
   */
  exec(command: string, args: string[], options?: ExecOptions): Promise<ExecResult>;
```

4. Replace the whole `execCommand` function with:

```ts
function execCommand(command: string, args: string[], options: ExecOptions = {}): Promise<ExecResult> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    let timer: NodeJS.Timeout | undefined;
    const finish = (result: ExecResult): void => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(result);
    };
    let child: ChildProcess;
    try {
      child = crossSpawn(command, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    } catch (error) {
      finish({ code: 127, stdout: "", stderr: error instanceof Error ? error.message : String(error) });
      return;
    }
    if (options.timeoutMs !== undefined) {
      timer = setTimeout(() => {
        child.kill();
        finish({ code: 124, stdout, stderr: stderr || `${command} timed out after ${options.timeoutMs} ms` });
      }, options.timeoutMs);
    }
    child.stdout?.setEncoding("utf8").on("data", (chunk: string) => (stdout += chunk));
    child.stderr?.setEncoding("utf8").on("data", (chunk: string) => (stderr += chunk));
    // On Windows, cross-spawn turns cmd.exe's "not recognized" exit into this same ENOENT error.
    child.on("error", (error: NodeJS.ErrnoException) =>
      finish({ code: error.code === "ENOENT" ? 127 : 1, stdout, stderr: stderr || error.message })
    );
    child.on("close", (code) => finish({ code: code ?? 1, stdout, stderr }));
  });
}
```

5. In `defaultMcpDeps()`, change `spawn` and `exec` to:

```ts
    spawn: (command, args, options) => crossSpawn(command, args, options),
    exec: execCommand,
```

`openBrowser` keeps calling `execCommand(command, args)`, which now goes through `cross-spawn`.

- [ ] **Step 5: Run the tests and verify they pass**

Run: `pnpm test tests/unit/cli/deps.test.ts tests/unit/cli`
Expected: PASS. `deps.test.ts` shows 3 passed and 1 skipped on Linux; the other CLI suites stay
green.

- [ ] **Step 6: Prove the timeout guard**

Temporarily delete the `if (options.timeoutMs !== undefined) { … }` block, then run
`pnpm test tests/unit/cli/deps.test.ts`. Expected: `gives up after timeoutMs with code 124` FAILS.
Restore the block and run the tests again: PASS.

- [ ] **Step 7: Commit**

```bash
pnpm fix:format
git add package.json pnpm-lock.yaml src/cli/mcp/deps.ts tests/unit/cli/deps.test.ts
git commit -m "feat(cli): spawn through cross-spawn so Windows .cmd shims run; exec timeout"
```

---

### Task 3: `renameWithRetry`

**Files:**

- Create: `src/mcp/fs-util.ts`
- Modify: `src/mcp/config.ts` (`writeEnvFile`), `src/cli/mcp/install.ts` (`removeJsoncKey`)
- Test: `tests/unit/mcp/fs-util.test.ts` (create)

**Interfaces:**

- Produces: `renameWithRetry(from: string, to: string, options?: RenameOptions): void` and
  `RENAME_ATTEMPTS = 5`, with
  `interface RenameOptions { platform?: NodeJS.Platform; rename?: (from: string, to: string) => void; sleep?: (ms: number) => void }`.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/mcp/fs-util.test.ts`:

```ts
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { RENAME_ATTEMPTS, renameWithRetry } from "../../../src/mcp/fs-util";

/** A rename that throws the given codes in order, then succeeds. */
function failing(codes: string[]) {
  const calls: string[] = [];
  const rename = (from: string, to: string): void => {
    calls.push(`${from}->${to}`);
    const code = codes.shift();
    if (code) throw Object.assign(new Error(`${code}: resource busy`), { code });
  };
  return { calls, rename };
}

describe("renameWithRetry", () => {
  it("retries a locked target on win32 with growing waits, then succeeds", () => {
    const fake = failing(["EBUSY", "EPERM"]);
    const waits: number[] = [];
    renameWithRetry("a.tmp", "a", { platform: "win32", rename: fake.rename, sleep: (ms) => waits.push(ms) });
    expect(fake.calls).toHaveLength(3);
    expect(waits).toEqual([50, 100]);
  });

  it("gives up after RENAME_ATTEMPTS and names the target", () => {
    const fake = failing(Array(10).fill("EACCES"));
    expect(() =>
      renameWithRetry("a.tmp", "C:\\cfg\\.env", { platform: "win32", rename: fake.rename, sleep: () => undefined })
    ).toThrow("C:\\cfg\\.env");
    expect(fake.calls).toHaveLength(RENAME_ATTEMPTS);
  });

  it("never retries off Windows, nor an error that waiting cannot fix", () => {
    const linux = failing(["EBUSY"]);
    expect(() => renameWithRetry("a.tmp", "a", { platform: "linux", rename: linux.rename })).toThrow("EBUSY");
    expect(linux.calls).toHaveLength(1);
    const missing = failing(["ENOENT"]);
    expect(() =>
      renameWithRetry("a.tmp", "a", { platform: "win32", rename: missing.rename, sleep: () => undefined })
    ).toThrow("ENOENT");
    expect(missing.calls).toHaveLength(1);
  });

  it("replaces a real file", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "plane-rename-"));
    try {
      fs.writeFileSync(path.join(dir, "x.tmp"), "new");
      fs.writeFileSync(path.join(dir, "x"), "old");
      renameWithRetry(path.join(dir, "x.tmp"), path.join(dir, "x"));
      expect(fs.readFileSync(path.join(dir, "x"), "utf8")).toBe("new");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `pnpm test tests/unit/mcp/fs-util.test.ts`
Expected: FAIL with `Cannot find module '../../../src/mcp/fs-util'`.

- [ ] **Step 3: Implement**

Create `src/mcp/fs-util.ts`:

```ts
import * as fs from "node:fs";

/** How many times {@link renameWithRetry} tries before giving up. */
export const RENAME_ATTEMPTS = 5;

/** Errors Windows raises while another process (antivirus, an editor, the indexer) holds the file. */
const LOCKED = new Set(["EPERM", "EBUSY", "EACCES"]);

export interface RenameOptions {
  platform?: NodeJS.Platform;
  rename?: (from: string, to: string) => void;
  sleep?: (ms: number) => void;
}

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * `renameSync`, retried on win32 while the target is locked: 50 ms, 100 ms, 200 ms… up to
 * {@link RENAME_ATTEMPTS} tries. Anywhere else, or for any other error, it throws at once. The
 * error that escapes names the target.
 */
export function renameWithRetry(from: string, to: string, options: RenameOptions = {}): void {
  const { platform = process.platform, rename = fs.renameSync, sleep = sleepSync } = options;
  for (let attempt = 1; ; attempt++) {
    try {
      rename(from, to);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code ?? "";
      if (platform !== "win32" || !LOCKED.has(code) || attempt >= RENAME_ATTEMPTS) {
        if (error instanceof Error && !error.message.includes(to)) error.message += ` (renaming onto ${to})`;
        throw error;
      }
      sleep(50 * 2 ** (attempt - 1));
    }
  }
}
```

In `src/mcp/config.ts`, add `import { renameWithRetry } from "./fs-util";`, and in `writeEnvFile`
replace `fs.renameSync(temporary, file);` with `renameWithRetry(temporary, file);`.

In `src/cli/mcp/install.ts`, add `import { renameWithRetry } from "../../mcp/fs-util";`, and in
`removeJsoncKey` replace `fs.renameSync(temporary, location.file);` with
`renameWithRetry(temporary, location.file);`.

- [ ] **Step 4: Run the tests and verify they pass**

Run: `pnpm test tests/unit/mcp/fs-util.test.ts tests/unit/mcp/config.test.ts tests/unit/cli/mcp-install.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm fix:format
git add src/mcp/fs-util.ts src/mcp/config.ts src/cli/mcp/install.ts tests/unit/mcp/fs-util.test.ts
git commit -m "feat(mcp): retry renames that Windows file locks refuse"
```

---

### Task 4: Graceful stop through `POST /shutdown`

**Files:**

- Modify: `src/mcp/server.ts`, `src/cli/mcp/daemon.ts`, `src/cli/mcp/deps.ts`, `src/cli/mcp/index.ts`
- Test: `tests/unit/mcp/server.test.ts`, `tests/unit/cli/mcp.test.ts`

**Interfaces:**

- Consumes: `McpDeps` from Task 2.
- Produces:
  - `PlaneMcpServerOptions.shutdownToken?: string` and `PlaneMcpServerOptions.onShutdown?: () => void`;
  - `DaemonState.shutdownToken?: string`;
  - `McpDeps.exit(code: number): void`;
  - `stopServer(configFile: string, deps: McpDeps, timeoutMs?: number, warn?: (text: string) => void): Promise<StoppedServer | undefined>`
    with `interface StoppedServer { state: DaemonState; graceful: boolean }`;
  - `requestShutdown(port: number, token: string, timeoutMs?: number): Promise<boolean>`.

- [ ] **Step 1: Write the failing server tests**

Append to `tests/unit/mcp/server.test.ts`. `running`, `BASE` and `startPlaneMcpServer` are
already in scope there:

```ts
describe("POST /shutdown", () => {
  async function post(url: string, token?: string): Promise<number> {
    const response = await fetch(new URL("/shutdown", url), {
      method: "POST",
      headers: token === undefined ? {} : { "X-Plane-Shutdown": token },
    });
    return response.status;
  }

  it("answers 202 and calls onShutdown for the right token, 403 for any other", async () => {
    let shutdowns = 0;
    running = await startPlaneMcpServer({
      port: 0,
      baseUrl: BASE,
      apiKey: "k",
      shutdownToken: "s3cret",
      onShutdown: () => shutdowns++,
    });
    expect(await post(running.url)).toBe(403);
    expect(await post(running.url, "wrong")).toBe(403);
    expect(await post(running.url, "s3cret-and-more")).toBe(403);
    expect(shutdowns).toBe(0);
    expect(await post(running.url, "s3cret")).toBe(202);
    await new Promise((resolve) => setImmediate(resolve));
    expect(shutdowns).toBe(1);
  });

  it("refuses every request when the server has no token", async () => {
    running = await startPlaneMcpServer({ port: 0, baseUrl: BASE, apiKey: "k" });
    expect(await post(running.url, "")).toBe(403);
    expect(await post(running.url, "anything")).toBe(403);
  });
});
```

- [ ] **Step 2: Write the failing CLI tests**

In `tests/unit/cli/mcp.test.ts`:

1. In `fakeDeps`, add `exit: () => undefined,` next to `uid`. That way no test can call
   `process.exit`.
2. Add `readState` to the existing import from `../../../src/cli/mcp/daemon`.
3. In the existing test `starts in the background with one-off values it never saves, then stops`,
   after `expect(stopped.stdout).toBe("Stopped the Plane MCP server (pid 424242).");`, add:

```ts
// A state file without a shutdown token (as older versions wrote) goes straight to kill, quietly.
expect(stopped.stderr).toBe("");
```

4. Add these tests to `describe("plane mcp", …)`:

```ts
it("stops a foreground server gracefully through its shutdown token", async () => {
  writeEnvFile(configFile, { PLANE_API_KEY: "saved", PLANE_BASE_URL: BASE });
  let exited = false;
  const kills: number[] = [];
  const deps = fakeDeps({
    isAlive: (pid) => pid === process.pid && !exited,
    kill: (pid) => kills.push(pid),
    exit: () => {
      exited = true;
    },
  });
  expect((await cli(["mcp", "start", "--foreground", "--port", "0"], deps)).code).toBe(0);
  expect(readState(configFile)?.shutdownToken).toMatch(/^[0-9a-f]{64}$/);

  const stopped = await cli(["mcp", "stop"], deps);
  expect(stopped.stdout).toBe(`Stopped the Plane MCP server (pid ${process.pid}).`);
  expect(stopped.stderr).toBe("");
  expect(exited).toBe(true);
  expect(kills).toEqual([]);
  expect(fs.existsSync(statePath(configFile))).toBe(false);
});

it("falls back to kill, and says so, when the graceful stop gets no answer", async () => {
  writeEnvFile(configFile, { PLANE_API_KEY: "saved" });
  const alive = new Set([4242]);
  fs.mkdirSync(path.dirname(statePath(configFile)), { recursive: true });
  fs.writeFileSync(
    statePath(configFile),
    JSON.stringify({
      pid: 4242,
      port: 1,
      url: "http://127.0.0.1:1/mcp",
      startedAt: new Date().toISOString(),
      configFile,
      shutdownToken: "t",
    })
  );
  const deps = fakeDeps({ isAlive: (pid) => alive.has(pid), kill: (pid) => alive.delete(pid) });
  const stopped = await cli(["mcp", "stop"], deps);
  expect(stopped.stdout).toBe("Stopped the Plane MCP server (pid 4242).");
  expect(stopped.stderr).toContain("Graceful stop failed; terminating pid 4242.");
});
```

- [ ] **Step 3: Run the tests and verify they fail**

Run: `pnpm test tests/unit/mcp/server.test.ts tests/unit/cli/mcp.test.ts`
Expected: FAIL. TypeScript reports `shutdownToken` as not in `PlaneMcpServerOptions`, and `exit`
as not in `McpDeps`.

- [ ] **Step 4: Implement the server route**

In `src/mcp/server.ts`:

1. Add `import { timingSafeEqual } from "node:crypto";`.
2. Add to `PlaneMcpServerOptions`:

```ts
  /** When set, `POST /shutdown` with header `X-Plane-Shutdown: <token>` calls {@link onShutdown}. */
  shutdownToken?: string;
  /** Called after `/shutdown` has answered 202; the caller closes the server and leaves. */
  onShutdown?: () => void;
```

3. Add next to `HEALTH_PATH`: `const SHUTDOWN_PATH = "/shutdown";`, then add this function after
   `hostAllowed`:

```ts
/** Constant-time comparison, so the token cannot be guessed byte by byte from response times. */
function tokenMatches(expected: string | undefined, given: string | string[] | undefined): boolean {
  if (!expected || typeof given !== "string") return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}
```

4. In `handle`, right after the `HEALTH_PATH` block, insert:

```ts
if (pathname === SHUTDOWN_PATH && req.method === "POST") {
  if (!tokenMatches(options.shutdownToken, req.headers["x-plane-shutdown"])) {
    sendJson(res, 403, { error: "Forbidden." });
    return;
  }
  // Only once the 202 is on the wire: closing first would cut the response off.
  res.on("finish", () => options.onShutdown?.());
  sendJson(res, 202, { ok: true });
  return;
}
```

- [ ] **Step 5: Implement the daemon side**

In `src/cli/mcp/deps.ts`, add to `McpDeps`:

```ts
  /** Leave the process; `process.exit` by default, a stand-in in tests. */
  exit(code: number): void;
```

and add to `defaultMcpDeps()`: `exit: (code) => process.exit(code),`.

In `src/cli/mcp/daemon.ts`:

1. Add `import { randomBytes } from "node:crypto";` and
   `import { RunningPlaneMcpServer } from "../../mcp/server";`. The latter extends the existing
   `startPlaneMcpServer` import to `import { RunningPlaneMcpServer, startPlaneMcpServer } from "../../mcp/server";`.
2. Add to `DaemonState`:

```ts
  /** Guards `POST /shutdown`; absent in state files written before graceful stop existed. */
  shutdownToken?: string;
```

3. Replace the body of `startForeground`, from `const server = await startPlaneMcpServer(config);`
   to the end of the function, with:

```ts
  const shutdownToken = randomBytes(32).toString("hex");
  let server: RunningPlaneMcpServer | undefined;
  let closing: Promise<void> | undefined;
  const close = (): Promise<void> => {
    closing ??= (async () => {
      process.off("SIGINT", onSignal);
      process.off("SIGTERM", onSignal);
      removeState(configFile, process.pid);
      await server?.close();
    })();
    return closing;
  };
  const leave = (): void => {
    void close().then(() => deps.exit(0));
  };
  const onSignal = (): void => leave();

  server = await startPlaneMcpServer({ ...config, shutdownToken, onShutdown: leave });
  writeState(configFile, {
    pid: process.pid,
    port: server.port,
    url: server.url,
    startedAt: new Date().toISOString(),
    configFile,
    shutdownToken,
  });
  log(`Plane MCP server listening on ${server.url}`);
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);
  deps.onForeground?.(close);
}
```

4. Replace `stopServer` with:

```ts
/** Ask a running server to leave; true when it answered 202. */
export function requestShutdown(port: number, token: string, timeoutMs = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path: "/shutdown",
        method: "POST",
        headers: { "X-Plane-Shutdown": token },
        timeout: timeoutMs,
      },
      (res) => {
        res.resume();
        resolve(res.statusCode === 202);
      }
    );
    req.on("timeout", () => req.destroy());
    req.on("error", () => resolve(false));
    req.end();
  });
}

async function waitForExit(pid: number, deps: McpDeps, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (deps.isAlive(pid)) {
    if (Date.now() >= deadline) return false;
    await sleep(100);
  }
  return true;
}

export interface StoppedServer {
  state: DaemonState;
  /** Whether it left through `/shutdown` rather than being killed. */
  graceful: boolean;
}

/**
 * Stop the running server: through `POST /shutdown` when its state file has a token (the same
 * on every platform — on Windows a signal is `TerminateProcess`, which runs no cleanup), then
 * with a signal if that fails. Answers `undefined` if none was running.
 */
export async function stopServer(
  configFile: string,
  deps: McpDeps,
  timeoutMs = 5000,
  warn: (text: string) => void = () => undefined
): Promise<StoppedServer | undefined> {
  const state = runningState(configFile, deps);
  if (state === undefined) return undefined;
  let graceful = false;
  if (state.shutdownToken) {
    graceful =
      (await requestShutdown(state.port, state.shutdownToken)) && (await waitForExit(state.pid, deps, timeoutMs));
    if (!graceful) warn(`Graceful stop failed; terminating pid ${state.pid}.`);
  }
  if (!graceful) {
    deps.kill(state.pid, "SIGTERM");
    if (!(await waitForExit(state.pid, deps, timeoutMs))) {
      throw new Error(`pid ${state.pid} did not stop within ${timeoutMs / 1000}s.`);
    }
  }
  removeState(configFile, state.pid);
  return { state, graceful };
}
```

5. `sleep` is declared lower in the file as a `const`. Move
   `const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));`
   up to just after the imports, so `waitForExit` can use it wherever it sits.

In `src/cli/mcp/index.ts`, in the `stop` command, replace:

```ts
const stopped = await stopServer(configFile, deps);
io.stdout(stopped ? `Stopped the Plane MCP server (pid ${stopped.pid}).` : "The Plane MCP server is not running.");
```

with:

```ts
const stopped = await stopServer(configFile, deps, undefined, io.stderr);
io.stdout(
  stopped ? `Stopped the Plane MCP server (pid ${stopped.state.pid}).` : "The Plane MCP server is not running."
);
```

- [ ] **Step 6: Run the tests and verify they pass**

Run: `pnpm test tests/unit/mcp/server.test.ts tests/unit/cli/mcp.test.ts`
Expected: PASS.

- [ ] **Step 7: Prove the token guard**

Temporarily change `tokenMatches` to `return true;`, then run `pnpm test tests/unit/mcp/server.test.ts`.
Expected: `answers 202 and calls onShutdown for the right token, 403 for any other` FAILS. Restore
the function and run again: PASS.

- [ ] **Step 8: Commit**

```bash
pnpm fix:format
git add src/mcp/server.ts src/cli/mcp/daemon.ts src/cli/mcp/deps.ts src/cli/mcp/index.ts tests/unit/mcp/server.test.ts tests/unit/cli/mcp.test.ts
git commit -m "feat(mcp): graceful stop through a token-guarded POST /shutdown"
```

---

### Task 5: Platform-neutral paths in `config.ts` and the tests

**Files:**

- Modify: `src/mcp/config.ts` (`configDir`, `configFilePath`)
- Test: `tests/unit/mcp/config.test.ts`, `tests/unit/cli/mcp-install.test.ts`

**Interfaces:** none new. `configDir(env, platform)` now builds its result with the path flavour
of `platform`, so the result is the same whichever OS runs it.

- [ ] **Step 1: Write the failing test**

Add to `tests/unit/mcp/config.test.ts`, inside the `describe` that tests `configDir`:

```ts
it("builds each platform's path with that platform's separators, whatever OS runs it", () => {
  expect(configDir({ HOME: "/home/ada" }, "linux")).toBe("/home/ada/.config/plane");
  expect(configDir({ HOME: "/Users/ada" }, "darwin")).toBe("/Users/ada/Library/Application Support/plane");
  expect(configDir({ APPDATA: "C:\\Users\\ada\\AppData\\Roaming" }, "win32")).toBe(
    "C:\\Users\\ada\\AppData\\Roaming\\plane"
  );
  expect(configFilePath({ HOME: "/home/ada", PLANE_CONFIG: "/etc/x.env" }, "linux")).toBe("/etc/x.env");
});
```

In the same file, change `expect(stateDir("/home/ada/.config/plane/.env")).toBe("/home/ada/.config/plane/run");`
to `expect(stateDir("/home/ada/.config/plane/.env")).toBe(path.join("/home/ada/.config/plane", "run"));`,
because `stateDir` works on real files and uses the host's separators. Add
`import * as path from "node:path";` if the file lacks it.

- [ ] **Step 2: Run it**

Run: `pnpm test tests/unit/mcp/config.test.ts`
Expected on Linux: PASS even before the change, because the host's `path.join` is already POSIX.
On Windows (the CI leg from Task 8) the unfixed code fails it, since `path.join` would produce
`\home\ada\…`. Step 5 proves the guard by mutation instead.

- [ ] **Step 3: Implement**

In `src/mcp/config.ts`, replace `configDir` and `configFilePath` with:

```ts
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
  if (env.PLANE_CONFIG) return flavour.resolve(env.PLANE_CONFIG);
  return flavour.join(configDir(env, platform), ".env");
}
```

- [ ] **Step 4: Make `mcp-install.test.ts` independent of the host's separators**

In `tests/unit/cli/mcp-install.test.ts`:

1. Add near the top:

```ts
const CLI_ENTRY = "/opt/plane/dist/cli/index.js";
/** What `nativeHost` derives from CLI_ENTRY, with the separators of the OS running the test. */
const SCRIPT = path.join(path.dirname(CLI_ENTRY), "..", "mcp", "cli.js");
```

2. In `fakeDeps`, use `cliEntry: CLI_ENTRY,`.
3. Replace `const SERVER = ["--", "/usr/bin/node", "/opt/plane/dist/mcp/cli.js"];` with
   `const SERVER = ["--", "/usr/bin/node", SCRIPT];`.
4. In `prints the commands and runs nothing with --dry-run`, replace the
   `toContain("opencode mcp add --global plane -- /usr/bin/node /opt/plane/dist/mcp/cli.js")`
   assertion with:

```ts
expect(result.stdout).toContain("opencode mcp add --global plane -- /usr/bin/node");
expect(result.stdout).toContain(SCRIPT);
```

- [ ] **Step 5: Run the tests, then prove the guard**

Run: `pnpm test tests/unit/mcp/config.test.ts tests/unit/cli`
Expected: PASS.

Then, temporarily change `const posix = path.posix;` in `configDir` to `const posix = path.win32;`
and run `pnpm test tests/unit/mcp/config.test.ts`. Expected:
`builds each platform's path with that platform's separators, whatever OS runs it` FAILS. Restore
`path.posix` and run again: PASS.

- [ ] **Step 6: Commit**

```bash
pnpm fix:format
git add src/mcp/config.ts tests/unit/mcp/config.test.ts tests/unit/cli/mcp-install.test.ts
git commit -m "fix(mcp): build config paths in the target platform's flavour; host-neutral tests"
```

---

### Task 6: `ClientHost` with the native host, and install/uninstall on top of it

**Files:**

- Create: `src/cli/mcp/hosts.ts`
- Modify: `src/cli/mcp/install.ts`, `src/cli/mcp/index.ts`
- Test: `tests/unit/cli/hosts.test.ts` (create), `tests/unit/cli/mcp-install.test.ts` (must stay green unchanged)

**Interfaces:**

- Consumes: `McpDeps.exec(command, args, { timeoutMs })` (Task 2).
- Produces (in `hosts.ts`):
  - `interface ServerLaunch { command: string[]; env: Record<string, string> }`, moved here from `install.ts`;
  - `interface FoundClient { command: string; version: string }`;
  - `interface ClientHost { id: "native" | "windows"; label: string; qualifier: string; env: Env; find(bin: string): Promise<FoundClient | undefined>; exec(command: string, args: string[]): Promise<ExecResult>; serverLaunch(configFile: string): ServerLaunch }`;
  - `const FIND_TIMEOUT_MS = 10_000`;
  - `function configEnv(deps: McpDeps, env: Env, configFile: string): Record<string, string>`;
  - `function firstLine(text: string): string`;
  - `function nativeHost(deps: McpDeps, env: Env): ClientHost`;
  - `function detectHosts(deps: McpDeps, env: Env): Promise<ClientHost[]>`.
- Produces (in `install.ts`):
  - `ClientStatus` gains `host: ClientHost` and `command?: string`;
  - `detectClients(hosts: ClientHost[]): Promise<ClientStatus[]>`;
  - `installSteps(client: ClientStatus, launch: ServerLaunch, replace: boolean): InstallStep[]`;
  - `runSteps(host: ClientHost, steps: InstallStep[]): Promise<InstallOutcome>`;
  - `uninstallActions(client: ClientStatus): UninstallAction[]`, whose exec steps use `client.command`;
  - `runUninstall(host: ClientHost, actions: UninstallAction[]): Promise<InstallOutcome>`;
  - `displayName(client: ClientStatus): string` and `flagId(client: ClientStatus): string`.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/cli/hosts.test.ts`:

```ts
import * as path from "node:path";
import { ExecOptions, ExecResult, McpDeps } from "../../../src/cli/mcp/deps";
import { FIND_TIMEOUT_MS, detectHosts, nativeHost } from "../../../src/cli/mcp/hosts";

type Call = { command: string; args: string[]; options?: ExecOptions };

/** Deps whose exec answers from `answer`, recording every call. */
function fakeHostDeps(answer: (call: Call) => ExecResult, overrides: Partial<McpDeps> = {}) {
  const calls: Call[] = [];
  const deps = {
    platform: "linux",
    nodePath: "/usr/bin/node",
    cliEntry: "/opt/plane/dist/cli/index.js",
    isWsl: () => false,
    exec: async (command: string, args: string[], options?: ExecOptions) => {
      const call = { command, args, options };
      calls.push(call);
      return answer(call);
    },
    ...overrides,
  } as McpDeps;
  return { deps, calls };
}

const ok = (stdout: string): ExecResult => ({ code: 0, stdout, stderr: "" });
const missing: ExecResult = { code: 127, stdout: "", stderr: "ENOENT" };

describe("nativeHost", () => {
  it("finds a client by its --version, bounded by FIND_TIMEOUT_MS", async () => {
    const { deps, calls } = fakeHostDeps((call) =>
      call.command === "claude" ? ok("2.1.282 (Claude Code)\r\n") : missing
    );
    const host = nativeHost(deps, { HOME: "/home/ada" });
    await expect(host.find("claude")).resolves.toEqual({ command: "claude", version: "2.1.282 (Claude Code)" });
    await expect(host.find("codex")).resolves.toBeUndefined();
    expect(calls[0]).toEqual({ command: "claude", args: ["--version"], options: { timeoutMs: FIND_TIMEOUT_MS } });
  });

  it("launches node on the packaged cli.js, adding PLANE_CONFIG only for a non-default file", () => {
    const { deps } = fakeHostDeps(() => missing);
    const host = nativeHost(deps, { HOME: "/home/ada" });
    const script = path.join("/opt/plane/dist/cli", "..", "mcp", "cli.js");
    expect(host.serverLaunch("/home/ada/.config/plane/.env")).toEqual({ command: ["/usr/bin/node", script], env: {} });
    expect(host.serverLaunch("/work/other.env")).toEqual({
      command: ["/usr/bin/node", script],
      env: { PLANE_CONFIG: "/work/other.env" },
    });
  });

  it("is the only host outside WSL", async () => {
    const { deps } = fakeHostDeps(() => missing);
    const hosts = await detectHosts(deps, { HOME: "/home/ada" });
    expect(hosts.map((host) => host.id)).toEqual(["native"]);
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `pnpm test tests/unit/cli/hosts.test.ts`
Expected: FAIL with `Cannot find module '../../../src/cli/mcp/hosts'`, or `isWsl` missing from
`McpDeps`.

- [ ] **Step 3: Add `isWsl` to `McpDeps`**

In `src/cli/mcp/deps.ts`, add to `McpDeps`:

```ts
  /** Whether this process runs inside WSL (`/proc/version` names Microsoft). */
  isWsl(): boolean;
```

and add `isWsl,` to the object `defaultMcpDeps()` returns; the function already exists in the
file. In `tests/unit/cli/mcp.test.ts` and `tests/unit/cli/mcp-install.test.ts`, add
`isWsl: () => false,` to each `fakeDeps`. Without it, a test run inside WSL would probe the real
Windows side.

- [ ] **Step 4: Create `src/cli/mcp/hosts.ts`**

```ts
import * as path from "node:path";
import { configFilePath } from "../../mcp/config";
import { ExecResult, McpDeps } from "./deps";

type Env = Record<string, string | undefined>;

/** A client that does not answer `--version` within this is treated as not installed. */
export const FIND_TIMEOUT_MS = 10_000;

/** What a client runs to start `plane-mcp` over stdio, plus the env it needs. */
export interface ServerLaunch {
  command: string[];
  env: Record<string, string>;
}

/** A client CLI a host found: how to run it, and the first line of its `--version`. */
export interface FoundClient {
  command: string;
  version: string;
}

/** Where clients live, and how to reach them from this process. */
export interface ClientHost {
  id: "native" | "windows";
  /** Shown after a client's name in the picker, `Claude Code (Windows)`; "" for native. */
  label: string;
  /** Appended to a client id in `--client`, `claude@windows`; "" for native. */
  qualifier: string;
  /** The environment the entry readers resolve config paths from: HOME and the clients' own overrides. */
  env: Env;
  /** Locate a client CLI and read its version; `undefined` when it is absent or does not answer. */
  find(bin: string): Promise<FoundClient | undefined>;
  /** Run a found client's CLI; same contract as `McpDeps.exec`. */
  exec(command: string, args: string[]): Promise<ExecResult>;
  /** The command a client on this host runs to start `plane-mcp` over stdio. */
  serverLaunch(configFile: string): ServerLaunch;
}

export function firstLine(text: string): string {
  return text.trim().split(/\r?\n/)[0] ?? "";
}

/** `PLANE_CONFIG`, only when `configFile` is not the default one: `plane-mcp` finds that by itself. */
export function configEnv(deps: McpDeps, env: Env, configFile: string): Record<string, string> {
  const { PLANE_CONFIG: _override, ...withoutOverride } = env;
  return configFilePath(withoutOverride, deps.platform) === configFile ? {} : { PLANE_CONFIG: configFile };
}

/**
 * This platform: clients are on the PATH, and launch `node <dist>/mcp/cli.js` by absolute path,
 * as `plane mcp boot` does, so they do not depend on the PATH they hand their servers.
 */
export function nativeHost(deps: McpDeps, env: Env): ClientHost {
  return {
    id: "native",
    label: "",
    qualifier: "",
    env,
    async find(bin) {
      const result = await deps.exec(bin, ["--version"], { timeoutMs: FIND_TIMEOUT_MS });
      return result.code === 0 ? { command: bin, version: firstLine(result.stdout) } : undefined;
    },
    exec: (command, args) => deps.exec(command, args),
    serverLaunch(configFile) {
      const script = path.join(path.dirname(deps.cliEntry), "..", "mcp", "cli.js");
      return { command: [deps.nodePath, script], env: configEnv(deps, env, configFile) };
    },
  };
}

/** The hosts to look for clients in: this platform, plus Windows when running inside WSL (Task 7). */
export async function detectHosts(deps: McpDeps, env: Env): Promise<ClientHost[]> {
  return [nativeHost(deps, env)];
}
```

- [ ] **Step 5: Move `install.ts` onto hosts**

In `src/cli/mcp/install.ts`:

1. Delete `interface ServerLaunch` and `function serverLaunch` (they now live in `hosts.ts`), and
   remove the `configFilePath` import if nothing else uses it. Add:

```ts
import { ClientHost, ServerLaunch } from "./hosts";
```

and `export type { ServerLaunch } from "./hosts";` for any existing importer.

2. Add two fields to `ClientStatus`:

```ts
  /** Where the client lives. */
  host: ClientHost;
  /** How to run its CLI on that host (what `host.find` answered). */
  command?: string;
```

3. Replace `detectClients` with:

```ts
/** Every client on every host: whether it answers `--version`, and whether it already has a `plane` entry. */
export async function detectClients(hosts: ClientHost[]): Promise<ClientStatus[]> {
  const rows = hosts.flatMap((host) => CLIENTS.map((client) => ({ host, client })));
  return Promise.all(
    rows.map(async ({ host, client }) => {
      const found = await host.find(client.bin);
      return {
        ...client,
        host,
        installed: found !== undefined,
        command: found?.command,
        version: found?.version,
        entry: found ? FIND_ENTRY[client.id](host.env) : undefined,
      };
    })
  );
}

/** `Claude Code`, or `Claude Code (Windows)` on the bridge host. */
export function displayName(client: ClientStatus): string {
  return client.host.label ? `${client.name} (${client.host.label})` : client.name;
}

/** The id `--client` takes for it: `claude`, or `claude@windows`. */
export function flagId(client: ClientStatus): string {
  return `${client.id}${client.host.qualifier}`;
}
```

4. Replace `installSteps` so it uses the located command instead of the bare name:

```ts
/** The client CLI calls that register the server; `replace` first drops an existing entry where `add` would refuse. */
export function installSteps(client: ClientStatus, launch: ServerLaunch, replace: boolean): InstallStep[] {
  const bin = client.command ?? client.bin;
  const envPairs = Object.entries(launch.env).map(([key, value]) => `${key}=${value}`);
  switch (client.id) {
    case "claude":
      return [
        ...(replace ? [{ command: bin, args: ["mcp", "remove", "-s", "user", SERVER_ENTRY], optional: true }] : []),
        {
          command: bin,
          // `-e` is variadic, so the name goes before it and `--` ends it.
          args: [
            "mcp",
            "add",
            SERVER_ENTRY,
            "-s",
            "user",
            ...envPairs.flatMap((pair) => ["-e", pair]),
            "--",
            ...launch.command,
          ],
        },
      ];
    case "codex":
      return [
        ...(replace ? [{ command: bin, args: ["mcp", "remove", SERVER_ENTRY], optional: true }] : []),
        {
          command: bin,
          args: ["mcp", "add", SERVER_ENTRY, ...envPairs.flatMap((pair) => ["--env", pair]), "--", ...launch.command],
        },
      ];
    case "opencode":
      // `opencode mcp add` overwrites an entry of the same name; there is no `remove`.
      return [
        {
          command: bin,
          args: [
            "mcp",
            "add",
            "--global",
            ...envPairs.flatMap((pair) => ["--env", pair]),
            SERVER_ENTRY,
            "--",
            ...launch.command,
          ],
        },
      ];
  }
}
```

5. Change `runSteps(deps: McpDeps, …)` to `runSteps(host: ClientHost, steps: InstallStep[])`, with
   `await host.exec(step.command, step.args)` in place of `await deps.exec(...)`.
6. In `uninstallActions`, replace the literal `"claude"` / `"codex"` command strings with
   `client.command ?? client.bin`.
7. Change `runUninstall(deps: McpDeps, …)` to `runUninstall(host: ClientHost, actions: UninstallAction[])`,
   passing `host` to its `runSteps` call.
8. Remove the `McpDeps` import from `install.ts` if it is now unused.

- [ ] **Step 6: Wire `index.ts`**

In `src/cli/mcp/index.ts`:

1. Import `detectHosts` from `./hosts`, and `displayName` and `flagId` from `./install`. Drop
   `serverLaunch` from the `./install` import list.
2. In `clientsFromFlag`, replace the `known` line and the `find` call with:

```ts
const known = [...new Set(statuses.map(flagId))].join(", ");
```

```ts
const status = statuses.find((client) => flagId(client) === id);
```

and use `displayName(status)` instead of `status.name` in its two error messages. 3. In `chooseClients`, change `label: client.name,` to `label: displayName(client),`. 4. In both `install` and `uninstall`, replace `const statuses = await detectClients(deps, io.env);`
with:

```ts
const statuses = await detectClients(await detectHosts(deps, io.env));
```

5. In `install`'s `check` callback and in `uninstall`'s, use `displayName(client)` in place of
   `client.name`.
6. In `install`, delete `const launch = serverLaunch(deps, io.env, configFile);`, and in the loop
   replace the lines that compute `steps`, `label` and `outcome`:

```ts
      const width = Math.max(...chosen.map((client) => displayName(client).length));
      for (const client of chosen) {
        const steps = installSteps(client, client.host.serverLaunch(configFile), Boolean(client.entry));
        const label = displayName(client).padEnd(width);
```

and `const outcome = await runSteps(client.host, steps);`. 7. In `uninstall`, likewise:
`const width = Math.max(...chosen.map((client) => displayName(client).length));`,
`const label = displayName(client).padEnd(width);` and
`const outcome = await runUninstall(client.host, actions);`.

- [ ] **Step 7: Run the tests and verify they pass**

Run: `pnpm check:types && pnpm test tests/unit/cli`
Expected: PASS. `mcp-install.test.ts` passes without edits beyond Tasks 5 and 6 Step 3: native
rows keep the bare command names (`claude`, `opencode`) and the same labels.

- [ ] **Step 8: Prove the find timeout guard (Review Focus 3)**

Temporarily remove `{ timeoutMs: FIND_TIMEOUT_MS }` from `nativeHost.find`, then run
`pnpm test tests/unit/cli/hosts.test.ts`. Expected: `finds a client by its --version, bounded by FIND_TIMEOUT_MS`
FAILS. Restore it and run again: PASS.

- [ ] **Step 9: Commit**

```bash
pnpm fix:format
git add src/cli/mcp/hosts.ts src/cli/mcp/install.ts src/cli/mcp/index.ts src/cli/mcp/deps.ts tests/unit/cli/hosts.test.ts tests/unit/cli/mcp.test.ts tests/unit/cli/mcp-install.test.ts
git commit -m "refactor(cli): install/uninstall iterate over client hosts"
```

---

### Task 7: The `windows` host (WSL→Windows bridge)

**Files:**

- Modify: `src/cli/mcp/hosts.ts`, `src/cli/mcp/index.ts` (hints)
- Test: `tests/unit/cli/hosts.test.ts`, `tests/unit/cli/mcp-install.test.ts`

**Interfaces:**

- Consumes: everything Task 6 produced; `McpDeps.isWsl()`.
- Produces (in `hosts.ts`):
  - `CLIENT_BINS = ["claude", "codex", "opencode"] as const`;
  - `interface WindowsProbe { home: string; bins: Record<string, string | null> }`;
  - `windowsProbeScript(bins: readonly string[]): string`;
  - `encodePowerShell(script: string): string`, the base64 of UTF-16LE with the UTF-8 output prelude;
  - `decodePowerShell(encoded: string): string`, the inverse, used by tests;
  - `psQuote(arg: string): string`;
  - `probeWindows(deps: McpDeps, env: Env): Promise<WindowsProbe | undefined>`;
  - `windowsHost(deps: McpDeps, env: Env): Promise<ClientHost | undefined>`;
  - `detectHosts` now answers `[native, windows]` inside WSL when the probe succeeds.

- [ ] **Step 1: Write the failing host tests**

Append to `tests/unit/cli/hosts.test.ts`, and extend the `hosts` import to
`import { FIND_TIMEOUT_MS, decodePowerShell, detectHosts, nativeHost, psQuote, windowsHost } from "../../../src/cli/mcp/hosts";`:

```ts
const WIN_HOME = "C:\\Users\\João O'Brien";
const LINUX_HOME = "/mnt/c/Users/João O'Brien";
const CLAUDE_EXE = `${WIN_HOME}\\.local\\bin\\claude.exe`;
const CODEX_CMD = `${WIN_HOME}\\AppData\\Roaming\\npm\\codex.cmd`;

/** A fake Windows seen from WSL: PowerShell answers the probe and runs .cmd shims, wslpath converts. */
function fakeWindows(overrides: { probe?: ExecResult } = {}) {
  const scripts: string[] = [];
  const { deps, calls } = fakeHostDeps(
    ({ command, args }) => {
      if (command === "powershell.exe") {
        const script = decodePowerShell(args[args.indexOf("-EncodedCommand") + 1]);
        scripts.push(script);
        if (script.includes("ConvertTo-Json")) {
          return (
            overrides.probe ??
            ok(
              `\uFEFF${JSON.stringify({ home: WIN_HOME, bins: { claude: CLAUDE_EXE, codex: CODEX_CMD, opencode: null } })}`
            )
          );
        }
        if (script.includes(`& ${psQuote(CODEX_CMD)} '--version'`)) return ok("codex-cli 0.46.0\r\n");
        return ok("");
      }
      if (command === "wslpath") return ok(`${args[1].replace("C:\\", "/mnt/c/").replace(/\\/g, "/")}\n`);
      if (command === `${LINUX_HOME}/.local/bin/claude.exe` && args[0] === "--version")
        return ok("2.1.280 (Claude Code)\r\n");
      return missing;
    },
    { isWsl: () => true }
  );
  return { deps, calls, scripts };
}

const WSL_ENV = { HOME: "/home/ada", WSL_DISTRO_NAME: "Ubuntu" };

describe("psQuote", () => {
  it("single-quotes and doubles embedded quotes", () => {
    expect(psQuote("C:\\Users\\O'Brien\\x.cmd")).toBe("'C:\\Users\\O''Brien\\x.cmd'");
  });
});

describe("windowsHost", () => {
  it("reads the Windows home as UTF-8 and exposes it through its env", async () => {
    const { deps } = fakeWindows();
    const host = await windowsHost(deps, WSL_ENV);
    expect(host?.env).toEqual({ HOME: LINUX_HOME });
    expect(host?.label).toBe("Windows");
    expect(host?.qualifier).toBe("@windows");
  });

  it("runs an .exe through interop and a .cmd through encoded PowerShell", async () => {
    const { deps, scripts } = fakeWindows();
    const host = (await windowsHost(deps, WSL_ENV))!;
    await expect(host.find("claude")).resolves.toEqual({
      command: `${LINUX_HOME}/.local/bin/claude.exe`,
      version: "2.1.280 (Claude Code)",
    });
    await expect(host.find("codex")).resolves.toEqual({ command: CODEX_CMD, version: "codex-cli 0.46.0" });
    await expect(host.find("opencode")).resolves.toBeUndefined();

    await host.exec(CODEX_CMD, ["mcp", "add", "plane", "--", "wsl.exe", "it's"]);
    expect(scripts[scripts.length - 1]).toContain(
      `& ${psQuote(CODEX_CMD)} 'mcp' 'add' 'plane' '--' 'wsl.exe' 'it''s'\nexit $LASTEXITCODE`
    );
  });

  it("launches the server through wsl.exe with Linux paths, PLANE_CONFIG only for a non-default file", async () => {
    const { deps } = fakeWindows();
    const host = (await windowsHost(deps, WSL_ENV))!;
    const base = ["wsl.exe", "-d", "Ubuntu", "-e"];
    expect(host.serverLaunch("/home/ada/.config/plane/.env")).toEqual({
      command: [...base, "/usr/bin/node", "/opt/plane/dist/mcp/cli.js"],
      env: {},
    });
    expect(host.serverLaunch("/work/other.env")).toEqual({
      command: [...base, "env", "PLANE_CONFIG=/work/other.env", "/usr/bin/node", "/opt/plane/dist/mcp/cli.js"],
      env: {},
    });
  });

  it("is absent, without throwing, outside WSL or when PowerShell fails or answers garbage", async () => {
    expect(await windowsHost(fakeHostDeps(() => missing).deps, WSL_ENV)).toBeUndefined();
    expect(await windowsHost(fakeWindows({ probe: missing }).deps, WSL_ENV)).toBeUndefined();
    expect(await windowsHost(fakeWindows({ probe: ok("not json") }).deps, WSL_ENV)).toBeUndefined();
    expect(await windowsHost(fakeWindows().deps, { HOME: "/home/ada" })).toBeUndefined();
  });

  it("joins the native host inside WSL", async () => {
    const hosts = await detectHosts(fakeWindows().deps, WSL_ENV);
    expect(hosts.map((host) => host.id)).toEqual(["native", "windows"]);
  });
});
```

- [ ] **Step 2: Write the failing CLI tests**

Append to `tests/unit/cli/mcp-install.test.ts`:

```ts
describe("plane mcp install from WSL", () => {
  /** Linux side has nothing; the Windows side has claude.exe. */
  function bridgeDeps(extra: Partial<McpDeps> = {}) {
    const execs: string[][] = [];
    const deps: Partial<McpDeps> = {
      platform: "linux",
      nodePath: "/usr/bin/node",
      cliEntry: "/opt/plane/dist/cli/index.js",
      terminal: undefined,
      isWsl: () => true,
      exec: async (command: string, args: string[]): Promise<ExecResult> => {
        if (command === "powershell.exe") {
          return {
            code: 0,
            stdout: JSON.stringify({
              home: "C:\\Users\\ada",
              bins: { claude: "C:\\Users\\ada\\.local\\bin\\claude.exe", codex: null, opencode: null },
            }),
            stderr: "",
          };
        }
        if (command === "wslpath")
          return { code: 0, stdout: `${args[1].replace("C:\\", "/mnt/c/").replace(/\\/g, "/")}\n`, stderr: "" };
        if (command === "/mnt/c/Users/ada/.local/bin/claude.exe") {
          if (args[0] === "--version") return { code: 0, stdout: "2.1.280 (Claude Code)\n", stderr: "" };
          execs.push([command, ...args]);
          return { code: 0, stdout: "", stderr: "" };
        }
        return { code: 127, stdout: "", stderr: "ENOENT" };
      },
      ...extra,
    };
    return { deps, execs };
  }

  it("registers into the Windows client with a wsl.exe launch", async () => {
    save();
    const { deps, execs } = bridgeDeps();
    const result = await cli(["--client", "claude@windows"], deps, { WSL_DISTRO_NAME: "Ubuntu" });
    expect(result.stderr).toBe("");
    expect(execs).toEqual([
      [
        "/mnt/c/Users/ada/.local/bin/claude.exe",
        "mcp",
        "add",
        "plane",
        "-s",
        "user",
        "--",
        "wsl.exe",
        "-d",
        "Ubuntu",
        "-e",
        "/usr/bin/node",
        "/opt/plane/dist/mcp/cli.js",
      ],
    ]);
    expect(result.stdout).toContain("✔ Claude Code (Windows)  registered as 'plane'");
  });

  it("shows Windows rows in the picker with a via wsl.exe hint", async () => {
    save();
    const output = new PassThrough();
    let drawn = "";
    output.on("data", (chunk: Buffer) => (drawn += chunk.toString()));
    const input = Object.assign(new PassThrough(), { isRaw: false, setRawMode: () => undefined });
    input.write("\x1b");
    const { deps } = bridgeDeps({ terminal: { input, output } });
    expect((await cli([], deps, { WSL_DISTRO_NAME: "Ubuntu" })).code).toBe(130);
    expect(drawn).toContain("Claude Code (Windows)");
    expect(drawn).toContain("2.1.280 (Claude Code) · via wsl.exe");
  });

  it("says why a Windows client is unreachable instead of calling it unknown", async () => {
    save();
    const { deps } = bridgeDeps({ isWsl: () => false });
    const result = await cli(["--client", "claude@windows"], deps);
    expect(result.stderr).toContain("'claude@windows' needs the Windows side reachable from WSL");
    expect((await cli(["--client", "cursor"], deps)).stderr).toContain("Unknown client 'cursor'.");
  });
});
```

- [ ] **Step 3: Run the tests and verify they fail**

Run: `pnpm test tests/unit/cli/hosts.test.ts tests/unit/cli/mcp-install.test.ts`
Expected: FAIL. TypeScript reports `decodePowerShell`, `psQuote` and `windowsHost` as not
exported.

- [ ] **Step 4: Implement the Windows host**

Append to `src/cli/mcp/hosts.ts`:

```ts
/** The client CLIs the Windows probe looks for. */
export const CLIENT_BINS = ["claude", "codex", "opencode"] as const;

/** What the probe script answers: USERPROFILE, and the Windows path of each client CLI (or null). */
export interface WindowsProbe {
  home: string;
  bins: Record<string, string | null>;
}

const UTF8_OUTPUT = "[Console]::OutputEncoding = [Text.Encoding]::UTF8";

/**
 * PowerShell 5.1 that answers `{ home, bins }` as one line of JSON. It reads the user's and the
 * machine's `Path` from the registry (a `cmd.exe` started from WSL sees only system32), adds the
 * native installer's `.local\bin` and npm's global dir, and looks for `<bin>.exe`, then `<bin>.cmd`.
 */
export function windowsProbeScript(bins: readonly string[]): string {
  return [
    "$dirs = @()",
    "foreach ($scope in 'User', 'Machine') {",
    "  $value = [Environment]::GetEnvironmentVariable('Path', $scope)",
    "  if ($value) { $dirs += $value -split ';' }",
    "}",
    "$dirs += (Join-Path $env:USERPROFILE '.local\\bin'), (Join-Path $env:APPDATA 'npm')",
    "$found = @{}",
    `foreach ($bin in @(${bins.map(psQuote).join(", ")})) {`,
    "  $found[$bin] = $null",
    "  foreach ($dir in $dirs) {",
    "    if (-not $dir) { continue }",
    "    $dir = [Environment]::ExpandEnvironmentVariables($dir)",
    "    foreach ($ext in '.exe', '.cmd') {",
    "      try { $candidate = [IO.Path]::Combine($dir, $bin + $ext) } catch { continue }",
    "      if ([IO.File]::Exists($candidate)) { $found[$bin] = $candidate; break }",
    "    }",
    "    if ($found[$bin]) { break }",
    "  }",
    "}",
    "@{ home = $env:USERPROFILE; bins = $found } | ConvertTo-Json -Compress",
  ].join("\n");
}

/** A PowerShell single-quoted string: nothing inside is interpreted, and `'` is doubled. */
export function psQuote(arg: string): string {
  return `'${arg.replace(/'/g, "''")}'`;
}

/**
 * The `-EncodedCommand` payload: base64 of UTF-16LE, with a prelude that makes the output UTF-8.
 * Nothing needs quoting across WSL interop, which builds Windows command lines with MSVCRT rules.
 */
export function encodePowerShell(script: string): string {
  return Buffer.from(`${UTF8_OUTPUT}\n${script}`, "utf16le").toString("base64");
}

export function decodePowerShell(encoded: string): string {
  return Buffer.from(encoded, "base64").toString("utf16le");
}

function powershell(deps: McpDeps, script: string, timeoutMs: number): Promise<ExecResult> {
  return deps.exec("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", encodePowerShell(script)], {
    timeoutMs,
  });
}

/** The probe's answer, or `undefined` when not in WSL or when anything about it fails. */
export async function probeWindows(deps: McpDeps, env: Env): Promise<WindowsProbe | undefined> {
  if (!deps.isWsl() || !env.WSL_DISTRO_NAME) return undefined;
  const result = await powershell(deps, windowsProbeScript(CLIENT_BINS), FIND_TIMEOUT_MS);
  if (result.code !== 0) return undefined;
  try {
    const parsed = JSON.parse(result.stdout.replace(/^\uFEFF/, "").trim()) as Partial<WindowsProbe>;
    return typeof parsed.home === "string" && parsed.bins && typeof parsed.bins === "object"
      ? { home: parsed.home, bins: parsed.bins }
      : undefined;
  } catch {
    return undefined;
  }
}

async function toLinuxPath(deps: McpDeps, windowsPath: string): Promise<string | undefined> {
  const result = await deps.exec("wslpath", ["-u", windowsPath], { timeoutMs: FIND_TIMEOUT_MS });
  return result.code === 0 ? result.stdout.trim() : undefined;
}

const isCmd = (command: string): boolean => /\.(cmd|bat)$/i.test(command);

/**
 * Windows seen from inside WSL. Clients' configs are read under `/mnt/c/Users/<user>`. An `.exe`
 * runs directly through interop; a `.cmd` (npm's shims) runs through encoded PowerShell. A
 * client starts the server with `wsl.exe -d <distro> -e node <dist>/mcp/cli.js`. `undefined`
 * outside WSL, or when Windows cannot be reached.
 */
export async function windowsHost(deps: McpDeps, env: Env): Promise<ClientHost | undefined> {
  const probe = await probeWindows(deps, env);
  if (!probe) return undefined;
  const home = await toLinuxPath(deps, probe.home);
  if (!home) return undefined;
  const distro = env.WSL_DISTRO_NAME as string;

  const run = (command: string, args: string[], timeoutMs?: number): Promise<ExecResult> =>
    isCmd(command)
      ? powershell(deps, `& ${[command, ...args].map(psQuote).join(" ")}\nexit $LASTEXITCODE`, timeoutMs ?? 120_000)
      : deps.exec(command, args, timeoutMs === undefined ? undefined : { timeoutMs });

  return {
    id: "windows",
    label: "Windows",
    qualifier: "@windows",
    env: { HOME: home },
    async find(bin) {
      const located = probe.bins[bin];
      if (!located) return undefined;
      const command = isCmd(located) ? located : await toLinuxPath(deps, located);
      if (!command) return undefined;
      const result = await run(command, ["--version"], FIND_TIMEOUT_MS);
      return result.code === 0 ? { command, version: firstLine(result.stdout) } : undefined;
    },
    exec: (command, args) => run(command, args),
    serverLaunch(configFile) {
      const script = path.posix.join(path.posix.dirname(deps.cliEntry), "..", "mcp", "cli.js");
      const extra = configEnv(deps, env, configFile);
      const envArgs = extra.PLANE_CONFIG ? ["env", `PLANE_CONFIG=${extra.PLANE_CONFIG}`] : [];
      // Windows env vars do not cross into WSL, so PLANE_CONFIG rides on the command line instead.
      return { command: ["wsl.exe", "-d", distro, "-e", ...envArgs, deps.nodePath, script], env: {} };
    },
  };
}
```

Replace `detectHosts` with:

```ts
/** The hosts to look for clients in: this platform, plus Windows when running inside WSL. */
export async function detectHosts(deps: McpDeps, env: Env): Promise<ClientHost[]> {
  const windows = await windowsHost(deps, env);
  return windows ? [nativeHost(deps, env), windows] : [nativeHost(deps, env)];
}
```

- [ ] **Step 5: Add the picker hint**

In `src/cli/mcp/index.ts`, add above `installHint`:

```ts
/** How a client on this host is reached, appended to its picker hint. */
function hostHint(client: ClientStatus): string {
  return client.host.id === "windows" ? " · via wsl.exe" : "";
}
```

and change the two hints to include it:

```ts
function installHint(client: ClientStatus): string {
  if (!client.installed) return "not found";
  return client.entry
    ? `${client.version}${hostHint(client)} · already installed, reinstalls`
    : `${client.version ?? ""}${hostHint(client)}`;
}

function uninstallHint(client: ClientStatus): string {
  if (!client.installed) return "not found";
  return client.entry
    ? `${client.version}${hostHint(client)} · ${client.entry.transport}`
    : `no '${SERVER_ENTRY}' entry`;
}
```

In `clientsFromFlag`, right after `const status = statuses.find((client) => flagId(client) === id);`,
add:

```ts
if (!status && id.endsWith("@windows")) {
  throw new CliInputError(
    `'${id}' needs the Windows side reachable from WSL: run this inside WSL, with interop enabled ` +
      "(the powershell.exe probe got no usable answer)."
  );
}
```

- [ ] **Step 6: Run the tests and verify they pass**

Run: `pnpm check:types && pnpm test tests/unit/cli`
Expected: PASS.

- [ ] **Step 7: Prove the quoting guard (Review Focus 1)**

Temporarily change `psQuote` to ``return `'${arg}'`;``, then run `pnpm test tests/unit/cli/hosts.test.ts`.
Expected: `single-quotes and doubles embedded quotes` and
`runs an .exe through interop and a .cmd through encoded PowerShell` FAIL. Restore it and run
again: PASS.

- [ ] **Step 8: Try the real bridge in dry-run on this machine**

Run: `pnpm build && node dist/cli/index.js mcp install --client claude@windows --dry-run`
Expected: a line that starts `/mnt/c/Users/AlanReisAnjos/.local/bin/claude.exe mcp add plane -s user -- wsl.exe -d Ubuntu -e`,
followed by the Linux node and `…/dist/mcp/cli.js`. If PowerShell is slow the first time, it still
finishes within the 10 s probe budget.

- [ ] **Step 9: Commit**

```bash
pnpm fix:format
git add src/cli/mcp/hosts.ts src/cli/mcp/index.ts tests/unit/cli/hosts.test.ts tests/unit/cli/mcp-install.test.ts
git commit -m "feat(cli): install/uninstall reach Windows clients from WSL"
```

---

### Task 8: Windows in CI

**Files:**

- Modify: `.github/workflows/build-test.yaml` (job `build-lint`)

**Interfaces:** none.

- [ ] **Step 1: Turn `build-lint` into a matrix job**

Replace the header of `build-lint`, from `build-lint:` through its `actions/checkout@v4` step,
with:

```yaml
build-lint:
  strategy:
    fail-fast: false
    matrix:
      os: [ubuntu-latest, windows-latest]
  runs-on: ${{ matrix.os }}
  defaults:
    run:
      working-directory: plane-node-sdk
  steps:
    # Belt and braces next to .gitattributes: a CRLF checkout fails check:format.
    - name: Keep LF line endings
      if: runner.os == 'Windows'
      working-directory: ${{ github.workspace }}
      run: git config --global core.autocrlf false

    - uses: actions/checkout@v4
      with:
        path: plane-node-sdk
```

Leave the remaining steps as they are, but add `if: runner.os == 'Linux'` to the
`Run e2e tests` step, since the e2e tests need secrets and hit the real API:

```yaml
- name: Run e2e tests
  if: runner.os == 'Linux'
  run: pnpm run test:e2e
```

- [ ] **Step 2: Validate the YAML locally**

Run: `node -e "const y=require('fs').readFileSync('.github/workflows/build-test.yaml','utf8'); if(!/os: \[ubuntu-latest, windows-latest\]/.test(y)) process.exit(1)" && pnpm check:format`
Expected: exit 0; format clean.

- [ ] **Step 3: Commit, then ask before pushing**

```bash
git add .github/workflows/build-test.yaml
git commit -m "ci: build, lint and unit-test on windows-latest too"
```

Pushing and opening a PR publishes the branch. Ask the user before running
`git push -u origin feat/windows-support` and `gh pr create`. Once the PR exists, watch both
matrix legs with `gh pr checks --watch`.

- [ ] **Step 4: Fix what the Windows leg reports**

If `windows-latest` fails, reproduce each failing test name locally by reading its assertion, and
fix it with the pattern already used in this plan:

- a path compared as a literal: build the expectation with `path.join` (Task 5);
- a POSIX-only mode check: guard it with `if (process.platform !== "win32")`, as `config.test.ts:74`
  already does;
- a spawned command: it must go through `McpDeps` (Task 2).

Commit each fix as `fix(test): <what> on Windows`, then push again until both legs are green.

---

### Task 9: Documentation

**Files:**

- Modify: `README.md`, `CLAUDE.md`

**Interfaces:** none.

- [ ] **Step 1: README: a Windows section**

In `README.md`, after the paragraph that starts `` `install` detects each client by running its `--version` ``,
add:

```markdown
#### Windows

Everything above works from PowerShell or cmd on Windows 10/11 with Node ≥ 20. The settings file
lives in `%APPDATA%\plane\.env`, protected by that folder's per-user permissions (file modes mean
nothing on Windows). `plane mcp boot enable` registers a logon task. `plane mcp stop` asks the
server to shut down through a token-guarded `POST /shutdown` before falling back to terminating it.

**From WSL.** When the package is installed inside WSL, `plane mcp install` and `uninstall` also
list the clients installed on the Windows side, as `Claude Code (Windows)` and so on
(`--client claude@windows`). They start the server with `wsl.exe -d <distro> -e node …/dist/mcp/cli.js`,
so it keeps reading the configuration saved inside WSL. The first call after WSL has been idle
pays for the distro starting (a second or two).
```

- [ ] **Step 2: CLAUDE.md: architecture notes**

In `CLAUDE.md`, in the CLI paragraph, after the sentence about `install`/`uninstall`, add:

```markdown
They iterate over _hosts_ × clients (`src/cli/mcp/hosts.ts`): `native` always, and `windows` inside
WSL, reached through `powershell.exe -EncodedCommand` (UTF-8 output, the user's registry `Path`)
and `wslpath`. `McpDeps.exec`/`spawn` go through `cross-spawn`, so Windows `.cmd` shims run. `plane mcp stop`
tries `POST /shutdown` with the token from the daemon state file before signalling.
```

- [ ] **Step 3: Verify the docs gate**

Run: `pnpm test tests/unit/v2/readme-samples.test.ts && pnpm check:format`
Expected: PASS. This test checks the fences and the facts the docs state, such as paths that
exist and script names.

- [ ] **Step 4: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: Windows and the WSL bridge"
```

---

### Task 10: Manual smoke test on this machine

**Files:** none changed, unless a step fails. A failure becomes a fix with its own test in the
task that owns the code, followed by a re-run of this checklist.

**Precondition:** the user has installed Node ≥ 20 on Windows (for example with
`winget install OpenJS.NodeJS.LTS`) and opened a new terminal. From WSL,
`powershell.exe -NoProfile -Command "node --version"` answers `v20` or later.

- [ ] **Step 1: Install the packed package on Windows**

```bash
pnpm build
pnpm pack --pack-destination /mnt/c/Users/AlanReisAnjos/
powershell.exe -NoProfile -Command 'npm i -g "$env:USERPROFILE\hoyasumii-plane-0.0.1.tgz"'
powershell.exe -NoProfile -Command 'plane-mcp --help; plane --help | Select-Object -First 3'
```

Expected: both help texts print. This proves the `.cmd` shims and the shebang survive packing.

- [ ] **Step 2 (user, Windows Terminal):** `plane mcp config`. The browser opens, you save, and
      `%APPDATA%\plane\.env` exists. If the browser does not open, the `cmd /c start "" <url>` quoting
      failed: switch `openBrowser`'s win32 branch to `["explorer.exe", [url]]` and add a test in
      `mcp.test.ts`.
- [ ] **Step 3 (user):** `plane mcp install`. The picker renders in Windows Terminal (arrows, space,
      enter). `Claude Code` gets the entry, and `claude mcp list` shows `plane … ✔ Connected`.
- [ ] **Step 4 (user):** `plane mcp start`, `plane mcp status`, then `plane mcp stop`. `stop`
      prints no "Graceful stop failed" line, and `%APPDATA%\plane\run\mcp.log` ends with the server's
      last output.
- [ ] **Step 5 (user):** `plane mcp boot enable`, sign out and back in, check that
      `plane mcp status` says running, then `plane mcp boot disable`.
- [ ] **Step 6 (user):** `plane mcp uninstall`. The entry is gone from `%USERPROFILE%\.claude.json`.
- [ ] **Step 7: The bridge, from WSL**

Run: `node dist/cli/index.js mcp install --client claude@windows`, then
`powershell.exe -NoProfile -Command 'claude mcp list'`.
Expected: `plane: wsl.exe -d Ubuntu -e /usr/bin/node …/dist/mcp/cli.js - ✔ Connected`.

- [ ] **Step 8: Remove it again from WSL**

Run: `node dist/cli/index.js mcp uninstall --client claude@windows`
Expected: `✔ Claude Code (Windows)  removed 'plane'`, and `claude mcp list` on Windows no longer
shows it.

- [ ] **Step 9: Record the result**

Write the outcome of each step (pass, or the fix it needed) into the PR description.
