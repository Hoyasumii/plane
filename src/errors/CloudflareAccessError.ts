import { PlaneError } from "./PlaneError";

/** Cloudflare Access stood between the SDK and Plane: no token, an expired one, or its sign-in page. */
export class CloudflareAccessError extends PlaneError {
  constructor(message: string) {
    super(message, 401);
    this.name = "CloudflareAccessError";
  }
}
