import { BaseResource } from "./BaseResource";
import { Configuration } from "../Configuration";
import { InstanceInfo } from "../models/Instance";

/**
 * Instance API resource
 * Reads instance-level configuration and metadata. The endpoint lives under `/api/`, not `/api/v1/`.
 */
export class Instance extends BaseResource {
  protected apiBasePath: string = "/api";

  constructor(config: Configuration) {
    super(config);
  }

  /**
   * Get instance configuration and metadata
   */
  async retrieve(): Promise<InstanceInfo> {
    return this.get<InstanceInfo>("/instances/");
  }
}
