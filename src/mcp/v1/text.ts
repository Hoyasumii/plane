import { Marked } from "marked";
import { ToolInputError } from "../catalog";

/** `ACME-130` / `acme-130` → `{ identifier: "ACME", sequence: 130 }`. */
export function parseIssueKey(key: string): { identifier: string; sequence: number } {
  const match = /^\s*([A-Za-z][A-Za-z0-9]*)-(\d+)\s*$/.exec(String(key ?? ""));
  if (!match) {
    throw new ToolInputError(`Invalid task key: "${key}". Use the format PROJECT-NUMBER (e.g. ACME-130).`);
  }
  return { identifier: match[1].toUpperCase(), sequence: Number(match[2]) };
}

/** The editor stores an image as `<image-component src="<asset uuid>">`; `<img>` is the older form. */
const IMAGE_TAG = /<(?:image-component|img)\b[^>]*>/gi;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** An image in a description: a Plane asset, or an external `src` the MCP cannot download. */
export type HtmlImage = { n: number; asset_id: string } | { n: number; src: string };

/** Images in the HTML, in order; `n` is the number of the `[image n]` marker {@link htmlToText} leaves. */
export function htmlImages(html: string | null | undefined): HtmlImage[] {
  return [...String(html ?? "").matchAll(IMAGE_TAG)].map((match, index) => {
    const src = /\ssrc\s*=\s*"([^"]*)"/i.exec(match[0])?.[1] ?? "";
    return UUID.test(src) ? { n: index + 1, asset_id: src } : { n: index + 1, src };
  });
}

/** Plain text from Plane's HTML; every image becomes an `[image n]` line. */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  let n = 0;
  return String(html)
    .replace(IMAGE_TAG, () => `\n[image ${++n}]\n`)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote|pre)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function escapeHtml(value: string): string {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Plain text as Plane HTML: one escaped `<p>` per line. */
export function textToHtml(text: string): string {
  return String(text ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => (line.trim() ? `<p>${escapeHtml(line)}</p>` : "<p></p>"))
    .join("");
}

// Raw HTML inside the Markdown is escaped, never passed through to Plane.
const markdown = new Marked({ gfm: true, breaks: true }).use({
  renderer: { html: ({ text }) => escapeHtml(text) },
});

/** GFM (headings, lists, checkboxes, bold; a line break becomes `<br>`) as HTML, raw HTML escaped. */
export function markdownToHtml(md: string): string {
  return (markdown.parse(String(md ?? "").replace(/\r\n/g, "\n"), { async: false }) as string).trim();
}

/** Image type from the file signature — storage may answer `application/octet-stream`. */
export function sniffImage(buffer: Buffer): "png" | "jpg" | "gif" | "webp" | null {
  const hex = buffer.subarray(0, 12).toString("hex");
  if (hex.startsWith("89504e47")) return "png";
  if (hex.startsWith("ffd8ff")) return "jpg";
  if (hex.startsWith("474946")) return "gif";
  if (hex.startsWith("52494646") && hex.slice(16, 24) === "57454250") return "webp";
  return null;
}
