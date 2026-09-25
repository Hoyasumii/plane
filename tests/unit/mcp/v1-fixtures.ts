import nock from "nock";

export const BASE = "https://plane.example.com";
export const WS = "acme";
export const P = "11111111-1111-4111-8111-111111111111";
export const ISSUE = "22222222-2222-4222-8222-222222222222";
export const ASSET = "33333333-3333-4333-8333-333333333333";
export const ME = "44444444-4444-4444-8444-444444444444";
export const ANA = "55555555-5555-4555-8555-555555555555";
export const S_TODO = "66666666-6666-4666-8666-666666666666";
export const S_DONE = "77777777-7777-4777-8777-777777777777";
export const L_BUG = "88888888-8888-4888-8888-888888888888";

export const V1 = `/api/v1/workspaces/${WS}`;

export const project = { id: P, identifier: "ACME", name: "Acme" };
export const states = [
  { id: S_TODO, name: "Todo", group: "unstarted", default: true },
  { id: S_DONE, name: "Done", group: "completed" },
];
export const labels = [{ id: L_BUG, name: "bug" }];
export const members = [
  { id: ME, display_name: "alan", email: "alan@example.com", first_name: "Alan", last_name: "Reis" },
  { id: ANA, display_name: "ana", email: "ana@example.com", first_name: "Ana", last_name: "Lima" },
];

export function issue(overrides: Record<string, unknown> = {}) {
  return {
    id: ISSUE,
    name: "Login screen",
    sequence_id: 14,
    project: P,
    state: S_TODO,
    assignees: [ME],
    labels: [L_BUG],
    priority: "high",
    start_date: null,
    target_date: "2026-10-01",
    created_at: "2026-09-01T10:00:00Z",
    updated_at: "2026-09-20T10:00:00Z",
    description_html: "<p>See attachment</p>",
    description_stripped: "See attachment",
    ...overrides,
  };
}

const page = <T>(results: T[]) => ({ results, next_page_results: false, next_cursor: "x" });

/** The cached lookups every readable answer needs, each servable `times` times. */
export function lookups(times = 1) {
  return nock(BASE)
    .get(`${V1}/projects/`)
    .query(true)
    .times(times)
    .reply(200, page([project]))
    .get(`${V1}/projects/${P}/states/`)
    .query(true)
    .times(times)
    .reply(200, page(states))
    .get(`${V1}/projects/${P}/labels/`)
    .query(true)
    .times(times)
    .reply(200, page(labels))
    .get(`${V1}/projects/${P}/project-members/`)
    .times(times)
    .reply(200, members)
    .get("/api/v1/users/me/")
    .times(times)
    .reply(200, members[0]);
}
