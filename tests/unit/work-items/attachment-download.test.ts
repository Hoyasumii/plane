import nock from "nock";
import { PlaneClient } from "../../../src/client/plane-client";
import { AttachmentTooLargeError, HttpError } from "../../../src/errors";

const BASE = "https://plane.example.com";
const DETAIL = "/api/v1/workspaces/acme/projects/p1/issues/w1/issue-attachments/a1/";
const attachments = () => new PlaneClient({ baseUrl: BASE, apiKey: "secret" }).workItems.attachments;

afterEach(() => nock.cleanAll());

describe("workItems.attachments.download", () => {
  it("reads the redirect with the key and fetches storage without it", async () => {
    nock(BASE, { reqheaders: { "x-api-key": "secret" } })
      .get(DETAIL)
      .reply(302, "", { Location: "https://storage.example.com/signed?sig=1" });
    const storage = nock("https://storage.example.com", { badheaders: ["x-api-key"] })
      .get("/signed")
      .query({ sig: "1" })
      .reply(200, Buffer.from("bytes"), { "Content-Type": "Image/PNG; charset=binary" });

    const file = await attachments().download("acme", "p1", "w1", "a1");
    expect(file.data.toString()).toBe("bytes");
    expect(file.contentType).toBe("image/png");
    expect(storage.isDone()).toBe(true);
  });

  it("resolves a relative Location against the base URL", async () => {
    nock(BASE).get(DETAIL).reply(302, "", { Location: "/storage/x" });
    expect(await attachments().downloadUrl("acme", "p1", "w1", "a1")).toBe(`${BASE}/storage/x`);
  });

  it("refuses a file over maxBytes, by header or by body", async () => {
    nock(BASE)
      .get(DETAIL)
      .reply(302, "", { Location: "/s/announced" })
      .get("/s/announced")
      .reply(200, Buffer.alloc(4), { "Content-Length": "11" });
    await expect(attachments().download("acme", "p1", "w1", "a1", { maxBytes: 10 })).rejects.toBeInstanceOf(
      AttachmentTooLargeError
    );

    nock(BASE).get(DETAIL).reply(302, "", { Location: "/s/body" }).get("/s/body").reply(200, Buffer.alloc(11));
    await expect(attachments().download("acme", "p1", "w1", "a1", { maxBytes: 10 })).rejects.toMatchObject({
      attachmentId: "a1",
      maxBytes: 10,
    });
  });

  it("raises HttpError for an error or a non-redirect answer, with its headers", async () => {
    nock(BASE).get(DETAIL).reply(429, { detail: "slow down" }, { "Retry-After": "3" });
    const limited = await attachments()
      .downloadUrl("acme", "p1", "w1", "a1")
      .catch((error: unknown) => error);
    expect(limited).toBeInstanceOf(HttpError);
    expect(limited).toMatchObject({ statusCode: 429, headers: { "retry-after": "3" } });

    nock(BASE).get(DETAIL).reply(200, { id: "a1" });
    await expect(attachments().downloadUrl("acme", "p1", "w1", "a1")).rejects.toMatchObject({ statusCode: 200 });
  });
});
