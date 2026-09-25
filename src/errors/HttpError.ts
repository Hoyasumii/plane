import { PlaneError } from "./PlaneError";

/**
 * HTTP-specific error class for API request failures
 */
export class HttpError extends PlaneError {
  /** Response headers, lower-cased (e.g. `retry-after` on a 429), when a response arrived. */
  public headers?: Record<string, string>;

  constructor(message: string, statusCode: number, response?: any, headers?: Record<string, string>) {
    super(message, statusCode, response);
    this.name = "HttpError";
    this.headers = headers;
  }
}
