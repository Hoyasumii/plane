#!/usr/bin/env node
/**
 * `plane`: the Plane MCP server's tools as terminal commands.
 *
 *   PLANE_API_KEY=plane_api_… plane list-work-items --slug acme --project ENG
 *   plane --url http://127.0.0.1:3766/mcp whoami
 */
import { runCli } from "./run";

runCli(process.argv.slice(2), {
  // oxlint-disable-next-line no-console -- a CLI's output is the console
  stdout: (text) => console.log(text),
  // oxlint-disable-next-line no-console
  stderr: (text) => console.error(text),
  env: process.env,
}).then((code) => {
  process.exitCode = code;
});
