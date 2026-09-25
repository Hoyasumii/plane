# Windows support — design

Date: 2026-09-25
Status: approved in conversation, awaiting spec review

## Goal

`@hoyasumii/plane` works on Windows in two situations:

1. **Native Windows.** Node is installed on Windows. `plane`, `plane-mcp` and every
   `plane mcp` subcommand (`config`, `start`/`stop`/`status`, `boot`, `install`/`uninstall`)
   work from PowerShell or cmd, against Claude Code, Codex and OpenCode installed on Windows.
2. **WSL→Windows bridge.** The package is installed inside WSL, which is how it runs today.
   `plane mcp install`/`uninstall` can also register or remove the server in clients installed on
   the Windows side. Those clients launch it through `wsl.exe`.

Success means:

- a `windows-latest` CI job passes build, unit tests, lint and the format check on every PR;
- the manual smoke checklist (end of this document) passes on this machine once Node is
  installed on Windows.

## Non-goals

- macOS changes: it keeps working as it does today.
- PowerShell 7-specific behaviour. Everything must work under Windows PowerShell 5.1, the
  version this machine has (5.1.26100).
- NTFS ACL management for the saved `.env`.
- A Windows→WSL bridge, meaning a package installed on Windows serving clients inside WSL.

## Facts this design rests on

These were checked on this machine (Windows 11 build 26200, WSL distro `Ubuntu`):

- **Node refuses `.cmd`/`.bat` without a shell.** Since Node 20.12 (CVE-2024-27980),
  `execFile`/`spawn` on these files throws `EINVAL`. npm installs its CLIs, including this
  package's own `plane`/`plane-mcp`, as `.cmd` shims.
- **`cmd.exe` started from WSL gets a trimmed PATH.** Here it was just `C:\WINDOWS\system32`,
  so `where claude` finds nothing even though `%USERPROFILE%\.local\bin\claude.exe` exists.
- **`cmd.exe` writes in the OEM code page.** Its output reaches WSL garbled ("INFORMA��ES"), and a
  user name with accents would be garbled too. This machine has such users.
- **Interop runs a Windows `.exe` directly.** From WSL,
  `/mnt/c/Users/<user>/.local/bin/claude.exe --version` answers `2.1.280 (Claude Code)`.
- **Windows-side config locations:** Claude Code keeps its user config in
  `%USERPROFILE%\.claude.json` (present here, `mcpServers` empty). Codex uses
  `%USERPROFILE%\.codex\config.toml`. OpenCode uses `%USERPROFILE%\.config\opencode\`.
- **Signals:** on Windows `process.kill(pid, "SIGTERM")` is `TerminateProcess`. The target runs
  no handler, so its cleanup code never runs.
- **File modes:** `chmod`/`mode: 0o600` are no-ops on Windows beyond the read-only bit.
  `%APPDATA%` is already limited to its user by ACL.
- **`rename` onto an open file:** on Windows it can fail with `EPERM`/`EBUSY` while antivirus or
  an editor holds the file open.

## Design

### 1. Process spawning (`src/cli/mcp/deps.ts`)

- New dependency `cross-spawn`, with `@types/cross-spawn` as a dev dependency. `defaultMcpDeps()`
  builds `exec` and `spawn` on it, so `.cmd`/`.bat`/`.exe` resolve through `PATHEXT` and arguments
  are escaped for `cmd.exe`. It is used only inside `deps.ts`; no other module imports it.
- `exec` keeps its contract: it never throws, and a missing binary answers code 127. `cross-spawn`
  exports `spawn`, not `execFile`, so `exec` is rebuilt on `spawn`, collecting stdout and stderr. For
  a missing command on Windows, `cross-spawn`'s `lib/enoent.js` turns `cmd.exe`'s "not recognized"
  exit into an `ENOENT` error, which `exec` already maps to 127.
- `openBrowser` on Windows currently runs `cmd /c start "" <url>`. With `cross-spawn`, the empty
  title argument must still reach `start` as `""`. The smoke test verifies it. If it fails,
  `explorer.exe <url>` is the fallback.

### 2. Graceful stop (`src/cli/mcp/daemon.ts`, `src/mcp/server.ts`)

- `startPlaneMcpServer` gets an optional `shutdownToken`. When it is set, the server answers
  `POST /shutdown` with header `X-Plane-Shutdown: <token>` by closing itself and answering 202. A
  wrong or missing token gets 403. The existing `Host` check still applies, so the route answers
  only on loopback.
- `startForeground` generates the token (32 random bytes, hex encoded) and writes it into the
  daemon state file next to the pid. The state file is still created with `mode: 0o600`.
- Leaving the process goes through a new `McpDeps.exit(code)`, which defaults to `process.exit`. It
  is used by both the signal handler and `/shutdown`, so tests can observe the exit without it
  killing the test runner.
- `stopServer` first sends `POST /shutdown` with the token. If the request fails, or the process is
  still alive after the timeout, it falls back to `deps.kill(pid, "SIGTERM")` as today. This path
  is the same on every platform.
- `readState` accepts a state file without a token, as written by an older version. In that case
  `stop` goes straight to `kill`.

### 3. File writes (`src/mcp/config.ts`, `src/cli/mcp/install.ts`, `src/cli/mcp/daemon.ts`)

- New `renameWithRetry(from, to)` in `src/mcp/fs-util.ts`. On `EPERM`/`EBUSY`/`EACCES` under
  win32, it retries up to 5 times with 50 ms, 100 ms, 200 ms… backoff, then rethrows. Elsewhere
  it is a plain `renameSync`.
- `writeEnvFile`, `removeJsoncKey` and any other temp-then-rename write use it.
- `chmodSync(file, 0o600)` stays: it does no harm on Windows. The README says that on Windows the
  `.env` is protected by `%APPDATA%`'s per-user ACL, not by its mode.

### 4. Client hosts (`src/cli/mcp/hosts.ts`, new; `install.ts`, `index.ts`)

A **host** is a place where clients live, and it knows how to reach them:

```ts
interface ClientHost {
  id: "native" | "windows";
  /** Picker suffix and --client qualifier: "" for native, "Windows" for the bridge. */
  label: string;
  /** The home directory whose client configs this host reads, as a path this process can open. */
  home(): Promise<string>;
  /** Locate a client CLI; undefined when it is not installed. */
  locate(bin: string): Promise<string | undefined>;
  /** Run a located CLI (same contract as McpDeps.exec). */
  exec(located: string, args: string[]): Promise<ExecResult>;
  /** The command a client on this host runs to start `plane-mcp` over stdio. */
  serverLaunch(configFile: string, defaultConfigFile: string): ServerLaunch;
}
```

- **`native`** is used on every platform. It locates a CLI by running `<bin> --version` through
  `deps.exec`, which now goes through `cross-spawn`. Its home is `HOME`/`USERPROFILE`, its env
  vars (`CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `XDG_CONFIG_HOME`) apply as today, and it launches the
  server as `[deps.nodePath, <dist>/mcp/cli.js]`. On Windows that gives `C:\…\node.exe` and
  `C:\…\dist\mcp\cli.js`.
- **`windows`** is used only inside WSL. It is enabled when `/proc/version` matches `microsoft`,
  `WSL_DISTRO_NAME` is set, and `powershell.exe` answers.
  - **Windows queries** run through
    `powershell.exe -NoProfile -NonInteractive -EncodedCommand <base64 UTF-16LE>`. The script starts
    with `[Console]::OutputEncoding = [Text.Encoding]::UTF8`, so its output is UTF-8. Encoding the
    script means no quoting has to survive WSL interop, which builds Windows command lines with
    MSVCRT rules (`\"`) that `cmd.exe` does not understand.
  - **`home()`** reads `$env:USERPROFILE` and converts it with `wslpath -u`.
  - **`locate(bin)`** splits the user and machine `Path`
    (`[Environment]::GetEnvironmentVariable('Path','User')` and `'Machine'`), then adds
    `%USERPROFILE%\.local\bin` and `%APPDATA%\npm`. It checks each directory for
    `<bin>.exe`/`<bin>.cmd` and returns the first Windows path found. A single PowerShell call
    locates all three clients at once, and the result is cached for the command.
  - **`exec`** runs a `.exe` directly through interop, at its `wslpath -u` path. A `.cmd` runs
    through the same encoded PowerShell as `& '<path>' '<arg>' …` followed by
    `exit $LASTEXITCODE`. Every argument is single-quoted, with `'` doubled. The clients are Node
    CLIs that write UTF-8 to a pipe, so their output is read as UTF-8. Nothing here parses
    `cmd.exe` messages, which can come out garbled; detection relies only on exit codes and the
    PowerShell probe's JSON.
  - **`serverLaunch`** gives `["wsl.exe", "-d", WSL_DISTRO_NAME, "-e", deps.nodePath, <dist>/mcp/cli.js]`,
    with Linux paths. With a non-default config it inserts `env PLANE_CONFIG=<linux path>` after
    `-e`, because Windows env vars do not cross into WSL unless `WSLENV` lists them.
- **`install.ts` changes:**
  - `detectClients` becomes host × client. `ClientStatus` gains `host`.
  - The entry readers (`claudeEntry`, `codexEntry`, `opencodeEntry`) take the host's home instead
    of reading `env` directly. The env overrides apply only to the native host.
  - `installSteps`/`uninstallActions` run through `host.exec` and use the host's `serverLaunch`.
- **Picker rows:** Windows rows read `Claude Code (Windows)` with the hint
  `2.1.280 · via wsl.exe`. Pre-checking follows today's rules.
- **`--client`** accepts `claude`, `codex`, `opencode`, and inside WSL also `claude@windows`,
  `codex@windows`, `opencode@windows`. A bare name means the native host.
- **OpenCode on the Windows host:** since it has no `remove`, `uninstall` edits
  `/mnt/c/Users/<user>/.config/opencode/<file>` through `removeJsoncKey`, the same code as native.

### 5. Repository hygiene

- New `.gitattributes`: `* text=auto eol=lf`, plus `*.cmd text eol=crlf` and
  `*.vbs text eol=crlf` in case such files are ever committed. Without it, a Windows checkout with
  `core.autocrlf=true` fails `check:format` and can break the `#!/usr/bin/env node` shebangs.
- The `clean` script becomes `node -e "for (const d of ['dist','node_modules']) require('fs').rmSync(d,{recursive:true,force:true})"`.
- Other scripts are checked for POSIX-only syntax, for example `$VAR`, `&&` with `rm`, or
  `ts-node` paths with `/`. Anything found is fixed or documented.

### 6. Tests (`tests/unit/`)

- **Fakes lose fixed POSIX paths.** `mcp.test.ts` and `mcp-install.test.ts` use `/usr/bin/node`
  and `/opt/plane/dist/...` today. They build these with `path.join`/`path.resolve` from a fake
  root, and assertions compare against the same helpers. Tests that are about a specific platform
  (the systemd unit, the plist, the Windows `.cmd`/`.vbs`) keep their literal paths and set
  `platform` explicitly.
- **New tests:**
  - `deps.exec` through `cross-spawn`: a real `.cmd` written to a temp dir runs and receives
    arguments with spaces and quotes intact. This one runs only on win32 (`it.skip` elsewhere).
  - `deps.exec` answers 127 for a command that does not exist, on every platform (real call to a
    random name).
  - `/shutdown`: right token → 202 and the server closes; wrong or missing token → 403; `stop`
    uses it, then falls back to `kill` when it fails.
  - `renameWithRetry`: it retries on `EBUSY` and gives up after 5 attempts, using a fake `fs`.
  - The `windows` host with fake `powershell.exe`/`wslpath`/`cmd.exe` answers: UTF-8 home with
    accents, locate through the registry `Path` and the fallbacks, `.exe` vs `.cmd` exec, the
    `serverLaunch` shape with and without `--config`, and `--client claude@windows`.
  - Picker rows and `--client` qualifiers with both hosts present.
- **Every new sweep or guard is proven:** introduce the violation, watch it fail by name, revert.
  This is the repository's rule.

### 7. CI (`.github/workflows/build-test.yaml`)

- The unit-test job gets `strategy.matrix.os: [ubuntu-latest, windows-latest]`, running
  `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm test:unit`, `pnpm check:lint` and
  `pnpm check:format`.
- The e2e jobs stay on `ubuntu-latest`, because they need secrets and hit the real API.
- Checkout on Windows sets `git config --global core.autocrlf false` before
  `actions/checkout`, as a belt-and-braces measure alongside `.gitattributes`.

## Error handling

- **`windows` host detection:** if any probe fails (no `powershell.exe`, `wslpath` missing, a
  timeout of 10 s per call), the host is silently absent and only native rows show. With
  `--client x@windows` the failure is an error that names the probe that failed.
- **A client that does not answer `--version` within 10 s**, on either host, shows as `not found`.
  This covers a broken shim or a first-run prompt waiting for input, and the command does not
  hang.
- **`/shutdown` fallback:** when it falls back to `kill`, `stop` says so on stderr
  (`graceful stop failed (…); terminated pid N`) and still succeeds.
- **`renameWithRetry`:** when it gives up, the original error is rethrown, with the target path in
  the message.

## Manual smoke checklist (this machine, Node installed on Windows)

Native, from PowerShell:

1. `pnpm build` in a Windows clone, then `npm i -g .`. Check that `plane --help` and
   `plane-mcp --help` answer through the `.cmd` shims.
2. `plane mcp config` opens the browser and saves `%APPDATA%\plane\.env`.
3. `plane mcp install`: the picker renders in Windows Terminal and in conhost, `claude.exe` gets
   the entry, and a new Claude Code session lists the `plane` tools.
4. `plane mcp start`, `status`, `stop`: `stop` takes the graceful path, and the log shows the
   server closing.
5. `plane mcp boot enable`, sign out and back in, check the server is up, then `boot disable`.
6. `plane mcp uninstall` removes the entry.

Bridge, from WSL:

7. `plane mcp install` shows the `Claude Code (Windows)` row. After submitting, the Windows
   `.claude.json` has `wsl.exe -d Ubuntu -e /usr/bin/node …/cli.js`, and Claude Code on Windows
   lists and calls the `plane` tools.
8. `plane mcp uninstall` removes that entry from the Windows side.

## Risks

- **Codex on Windows is not installed anywhere here.** Its path is covered by fakes and by CI only
  (`codex mcp add` on a runner is out of scope).
- **`wsl.exe -e` cold start:** a client launching the server through `wsl.exe` pays for the
  distro starting (≈1–2 s) if WSL is not running yet. Clients tolerate slow server start-up, but
  this is noted in the README.
- **Windows PowerShell 5.1 is slow to start** (≈300–600 ms per call). The `windows` host makes at
  most two calls per command, `home` and `locate`, and caches them.
