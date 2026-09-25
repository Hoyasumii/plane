import { PlaneClient } from "../../src/client/plane-client";
import { createTestClient } from "../helpers/test-utils";
import { describeIf as describe } from "../helpers/conditional-tests";

describe(!!process.env.PLANE_API_KEY, "Instance API Tests", () => {
  let client: PlaneClient;

  beforeAll(() => {
    client = createTestClient();
  });

  it("should retrieve instance configuration and metadata", async () => {
    const info = await client.instance.retrieve();

    expect(info.config).toBeDefined();
    expect(info.instance).toBeDefined();
    expect(typeof info.instance.current_version).toBe("string");
  });
});
