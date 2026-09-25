/**
 * Instance-level configuration exposed by `GET /api/instances/`.
 */
export interface InstanceConfig {
  enable_signup?: boolean;
  is_workspace_creation_disabled?: boolean;
  is_google_enabled?: boolean;
  is_github_enabled?: boolean;
  is_gitlab_enabled?: boolean;
  is_gitea_enabled?: boolean;
  is_magic_login_enabled?: boolean;
  is_email_password_enabled?: boolean;
  github_app_name?: string;
  slack_client_id?: string | null;
  posthog_api_key?: string | null;
  posthog_host?: string | null;
  has_unsplash_configured?: boolean;
  has_llm_configured?: boolean;
  /** Maximum upload size in bytes */
  file_size_limit?: number;
  is_smtp_configured?: boolean;
  admin_base_url?: string | null;
  space_base_url?: string | null;
  app_base_url?: string | null;
  instance_changelog_url?: string;
  is_self_managed?: boolean;
}

/**
 * Instance metadata (version, edition, setup state).
 */
export interface InstanceDetails {
  id?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  instance_name?: string;
  whitelist_emails?: string | null;
  instance_id?: string;
  current_version?: string;
  latest_version?: string;
  edition?: "PLANE_COMMUNITY" | (string & {});
  domain?: string;
  last_checked_at?: string;
  namespace?: string | null;
  is_telemetry_enabled?: boolean;
  is_support_required?: boolean;
  is_setup_done?: boolean;
  is_signup_screen_visited?: boolean;
  is_verified?: boolean;
  is_test?: boolean;
  is_current_version_deprecated?: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  workspaces_exist?: boolean;
}

/**
 * Response of `GET /api/instances/`.
 */
export interface InstanceInfo {
  config: InstanceConfig;
  instance: InstanceDetails;
}
