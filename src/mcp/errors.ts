import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { HttpError } from "../errors/HttpError";
import { MissingPathIdError } from "../errors/MissingPathIdError";
import { MultipleMatchesFoundError, NoMatchFoundError, PlaneApiError } from "../errors/PlaneApiError";
import { PlaneNetworkError } from "../errors/PlaneNetworkError";
import { ToolInputError } from "./catalog";

/** What to do about a status the model cannot fix by changing arguments. */
function hintFor(status: number | undefined): string {
  if (status === 401 || status === 403) return " (check PLANE_API_KEY and that its user can access the project)";
  if (status === 429) return " (Plane's rate limit, 60 requests a minute: wait a minute and try again)";
  return "";
}

/** A thrown error as text the model can act on. */
export function describeError(error: unknown): string {
  if (error instanceof HttpError) {
    const detail = typeof error.response === "string" ? error.response : JSON.stringify(error.response ?? null);
    return (
      `Plane answered ${error.statusCode}${hintFor(error.statusCode)}: ${error.message}` +
      (detail && detail !== "null" && !error.message.includes(detail) ? ` — ${detail.slice(0, 500)}` : "")
    );
  }
  if (error instanceof PlaneApiError) {
    const lines = [`Plane API error ${error.status} ${error.code}: ${error.detail}${hintFor(error.status)}`];
    if (error.title) lines.push(`Title: ${error.title}`);
    for (const field of error.errors ?? []) lines.push(`- ${field.field}: ${field.message}`);
    return lines.join("\n");
  }
  if (error instanceof MissingPathIdError) {
    return `${error.message} (missing: ${error.missing})`;
  }
  if (error instanceof NoMatchFoundError || error instanceof MultipleMatchesFoundError) {
    return error.message;
  }
  if (error instanceof PlaneNetworkError) {
    return `Could not reach the Plane server: ${error.message}`;
  }
  if (error instanceof ToolInputError) return error.message;
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

export function errorResult(error: unknown): CallToolResult {
  return { isError: true, content: [{ type: "text", text: describeError(error) }] };
}
