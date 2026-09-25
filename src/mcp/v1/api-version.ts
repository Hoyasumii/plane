import { PlaneClient } from "../../client/plane-client";
import { PlaneApiError } from "../../errors/PlaneApiError";
import { PlaneNetworkError } from "../../errors/PlaneNetworkError";
import { ToolInputError } from "../catalog";

export type PlaneApiVersion = "v1" | "v2";

/**
 * Whether the instance serves `/api/v2`. Self-hosted Plane 1.4.x answers 404 to every
 * v2 route while `/api/v1` works; the typed tools then fall back to v1 and the generic
 * tools say so instead of relaying a raw 404.
 *
 * One `client.v2.users.me()` (`GET /api/v2/users/me/`), on first need. A 2xx or 404 is
 * kept for the life of the process; anything else (bad key, network) is not, so the next
 * call probes again.
 */
export class ApiVersionProbe {
  private known?: PlaneApiVersion;
  private pending?: Promise<PlaneApiVersion>;

  constructor(private readonly client: PlaneClient) {}

  /** The version found so far, without probing. */
  get current(): PlaneApiVersion | undefined {
    return this.known;
  }

  version(): Promise<PlaneApiVersion> {
    if (this.known) return Promise.resolve(this.known);
    this.pending ??= this.probe().finally(() => {
      this.pending = undefined;
    });
    return this.pending;
  }

  private async probe(): Promise<PlaneApiVersion> {
    try {
      await this.client.v2.users.me();
      return (this.known = "v2");
    } catch (error) {
      if (error instanceof PlaneNetworkError) {
        throw new ToolInputError(`Could not reach Plane at ${this.client.config.baseUrl}: ${error.message}`);
      }
      if (!(error instanceof PlaneApiError)) throw error;
      if (error.status === 404) return (this.known = "v1");
      if (error.status === 401 || error.status === 403) {
        throw new ToolInputError(
          `Plane answered ${error.status}: check PLANE_API_KEY and that its user can access the workspace.`
        );
      }
      throw new ToolInputError(
        `Plane answered ${error.status} while checking for API v2 at ${this.client.config.baseUrl}.`
      );
    }
  }
}
