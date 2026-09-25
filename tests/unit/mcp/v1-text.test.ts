import {
  htmlImages,
  htmlToText,
  markdownToHtml,
  parseIssueKey,
  sniffImage,
  textToHtml,
} from "../../../src/mcp/v1/text";

const ASSET = "0b9d1f2e-3c4a-4b5d-8e6f-7a8b9c0d1e2f";

describe("v1 text helpers", () => {
  it("parses task keys and explains the format when one is invalid", () => {
    expect(parseIssueKey(" acme-130 ")).toEqual({ identifier: "ACME", sequence: 130 });
    expect(() => parseIssueKey("130")).toThrow(
      'Invalid task key: "130". Use the format PROJECT-NUMBER (e.g. ACME-130).'
    );
    expect(() => parseIssueKey("POINT_130")).toThrow("PROJECT-NUMBER");
  });

  it("numbers images and replaces each with an [image n] marker", () => {
    const html =
      `<p>Before</p><image-component src="${ASSET}"></image-component>` +
      `<p>Middle &amp; end</p><img src="https://example.com/a.png"><ul><li>one</li></ul>`;
    expect(htmlImages(html)).toEqual([
      { n: 1, asset_id: ASSET },
      { n: 2, src: "https://example.com/a.png" },
    ]);
    expect(htmlToText(html)).toBe("Before\n\n[image 1]\nMiddle & end\n\n[image 2]\n- one");
    expect(htmlToText(null)).toBe("");
  });

  it("turns plain text into one escaped paragraph per line", () => {
    expect(textToHtml("a <b>\r\n\nc")).toBe("<p>a &lt;b&gt;</p><p></p><p>c</p>");
  });

  it("renders GFM and escapes raw HTML", () => {
    const html = markdownToHtml("## Title\n\n- [x] done\n- [ ] todo\n\n**bold**\nline 2\n\n<script>alert(1)</script>");
    expect(html).toContain("<h2>Title</h2>");
    expect(html).toMatch(/<li><input checked="" disabled="" type="checkbox"> ?done<\/li>/);
    expect(html).toMatch(/<input disabled="" type="checkbox"> ?todo/);
    expect(html).toContain("<strong>bold</strong><br>line 2");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("sniffs png, jpg, gif and webp by signature", () => {
    expect(sniffImage(Buffer.from("89504e470d0a1a0a", "hex"))).toBe("png");
    expect(sniffImage(Buffer.from("ffd8ffe0", "hex"))).toBe("jpg");
    expect(sniffImage(Buffer.from("GIF89a"))).toBe("gif");
    expect(sniffImage(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP")]))).toBe("webp");
    expect(sniffImage(Buffer.from("%PDF-1.7"))).toBeNull();
  });
});
