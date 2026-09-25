import { PlaneClient } from "../client/plane-client";
import { ApiVersionProbe } from "./v1/api-version";
import { PlaneV1Workspace, PlaneV1WorkspaceOptions } from "./v1/workspace";

/**
 * The state the MCP keeps across requests: the v1 layer (with its five-minute cache) and
 * the `/api/v2` probe. {@link startPlaneMcpServer} makes one per process, so every POST
 * shares the cache instead of refilling it.
 */
export interface PlaneMcpRuntime {
  v1: PlaneV1Workspace;
  probe: ApiVersionProbe;
}

export function createPlaneMcpRuntime(client: PlaneClient, options: PlaneV1WorkspaceOptions = {}): PlaneMcpRuntime {
  return { v1: new PlaneV1Workspace(client, options), probe: new ApiVersionProbe(client) };
}
