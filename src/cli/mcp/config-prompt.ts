import { ConfigKey, ConfigValues, DEFAULT_BASE_URL, DEFAULT_PORT } from "../../mcp/config";
import { configValueError } from "./config-ui";
import { PickerTerminal, TextInputOptions, textInput } from "./picker";

/** A blank line is fine (it means the default); anything else must pass the form's check. */
function optional(key: ConfigKey): (value: string) => string | undefined {
  return (value) => (value.trim() === "" ? undefined : configValueError(key, value.trim()));
}

/** The line each setting is asked with: the form's fields, as terminal prompts. */
function questions(saved: ConfigValues): [ConfigKey, TextInputOptions][] {
  const orDefault = (fallback: string) => (value: string) => value.trim() || `${fallback} (default)`;
  return [
    [
      "PLANE_API_KEY",
      {
        mask: true,
        hint: saved.PLANE_API_KEY ? "saved · enter keeps it" : "your Plane API key",
        placeholder: saved.PLANE_API_KEY ? "" : "plane_api_…",
        validate: (value) => (value.trim() || saved.PLANE_API_KEY ? undefined : "PLANE_API_KEY is required."),
        summary: (value) => (value.trim() ? "••••••••" : "kept"),
      },
    ],
    [
      "PLANE_BASE_URL",
      {
        hint: `your Plane instance · blank: ${DEFAULT_BASE_URL}`,
        initial: saved.PLANE_BASE_URL,
        placeholder: DEFAULT_BASE_URL,
        validate: optional("PLANE_BASE_URL"),
        summary: orDefault(DEFAULT_BASE_URL),
      },
    ],
    [
      "PLANE_WORKSPACE",
      {
        hint: "default workspace slug, used when a tool call names none · blank: none",
        initial: saved.PLANE_WORKSPACE,
        placeholder: "acme",
        summary: (value) => value.trim() || "none",
      },
    ],
    [
      "PORT",
      {
        hint: `MCP server port on 127.0.0.1 · blank: ${DEFAULT_PORT}`,
        initial: saved.PORT,
        placeholder: String(DEFAULT_PORT),
        validate: optional("PORT"),
        summary: orDefault(String(DEFAULT_PORT)),
      },
    ],
  ];
}

/**
 * Ask for each setting in turn, starting from the saved values, with the form's rules: a blank
 * key keeps the saved one, other blanks fall back to defaults. Answers what was entered, for
 * `valuesFromInput`, or `undefined` when a prompt was cancelled.
 */
export async function promptConfig(saved: ConfigValues, terminal: PickerTerminal): Promise<ConfigValues | undefined> {
  const input: ConfigValues = {};
  for (const [key, options] of questions(saved)) {
    const value = await textInput(key, options, terminal);
    if (value === undefined) return undefined;
    input[key] = value;
  }
  return input;
}
