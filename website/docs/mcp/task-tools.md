---
sidebar_position: 3
title: Task tools
---

# Task tools

These tools are the stable contract that task-driven agent workflows rely on. They take tasks by key
(`ACME-130`) and projects, states, labels and members by name, and they answer readable output with no ids.
They live in `src/mcp/tools/kit.ts`.

Every tool takes an optional `slug` (the workspace). With a default workspace configured (`PLANE_WORKSPACE`),
it can be omitted everywhere.

| Tool                     | What it does                                                                                             |
| ------------------------ | -------------------------------------------------------------------------------------------------------- |
| `plane_whoami`           | the key's user, the workspace, the base URL and the API the instance serves (`v1`/`v2`)                  |
| `plane_list_projects`    | projects of the workspace, with the identifier used in keys                                              |
| `plane_list_my_issues`   | tasks assigned to me (open ones by default), in one project or all of them                               |
| `plane_search_issues`    | a project's tasks by text, assignee and state group                                                      |
| `plane_get_issue`        | one task: state and group, priority, assignees and labels by name, dates, `url`, the description as text |
| `plane_get_issue_images` | downloads the description images to `image-<n>.<ext>` (default `<tmp>/plane-mcp/<KEY>/`)                 |
| `plane_list_comments`    | a task's comments, oldest first: author, date, text                                                      |
| `plane_add_comment`      | comments as the key's user                                                                               |
| `plane_create_issue`     | creates a task, writing state, labels and assignees by name                                              |
| `plane_update_issue`     | changes only the fields given                                                                            |
| `plane_list_states`      | the project's states, with their group                                                                   |
| `plane_list_labels`      | the project's labels                                                                                     |
| `plane_list_members`     | who can be assigned: display name and email                                                              |

None of these tools deletes anything.

## Inputs

| Tool                                                             | Inputs (besides `slug`)                                                                                            |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `plane_list_my_issues`                                           | `project?`, `state_groups?` (default: backlog, unstarted, started), `limit` (1–200, default 50)                    |
| `plane_search_issues`                                            | `project`, `query?`, `assignee?` (name, email or `"me"`), `state_groups?`, `limit` (1–200, default 30)             |
| `plane_get_issue`                                                | `key`                                                                                                              |
| `plane_get_issue_images`                                         | `key`, `dir?` (an absolute folder, created if missing)                                                             |
| `plane_list_comments`                                            | `key`                                                                                                              |
| `plane_add_comment`                                              | `key`, `text`, `format` (`"text"`, the default, or `"markdown"`)                                                   |
| `plane_create_issue`                                             | `project`, `title`, `description?`, `state?`, `priority?`, `assignees?`, `labels?`, `start_date?`, `target_date?`  |
| `plane_update_issue`                                             | `key`, then any of `title`, `description`, `state`, `priority`, `assignees`, `labels`, `start_date`, `target_date` |
| `plane_list_states` / `plane_list_labels` / `plane_list_members` | `project`                                                                                                          |

State groups are `backlog`, `unstarted`, `started`, `completed` and `cancelled`. Priorities are `urgent`,
`high`, `medium`, `low` and `none`. Dates are `YYYY-MM-DD`.

## How names are resolved

- **Projects** by identifier (`ACME`), name or id.
- **States** and **labels** by name, within the task's project.
- **Members** by `"me"`, email, display name, full name or id.

A value that matches nothing fails with the list of valid options, so the agent can correct itself.

## Writing

- `plane_create_issue` assigns the key's user unless `assignees` is given (`[]` means nobody).
- In `plane_update_issue`, `assignees` and `labels` replace the whole list, `description` replaces the whole
  description, and a `null` date clears it. Passing no field at all is an error.
- `description` is plain text: each line becomes a paragraph.
- In `plane_add_comment`, `format: "text"` makes one paragraph per line; `format: "markdown"` renders GFM
  (headings, lists, checkboxes, bold) and escapes raw HTML.

## Images

In `plane_get_issue`, each image of the description becomes an `[image n]` marker in the text and is listed in
`images`. `plane_get_issue_images` saves them in the same order, as `image-<n>.<ext>`, so the agent can open
them with its file-reading tool. It detects the type from the file signature and caps each file at 20 MB. A
failed or external image does not stop the others.

On Plane 1.4.2 the documented asset download (`GET /workspaces/<ws>/assets/<id>/`) answers 500. The server
therefore calls `client.workItems.attachments.download`, which reads the redirect from the attachment detail
and follows the signed URL without sending the API key.

## Rate limits and caching

Plane allows 60 requests a minute. On a `429` the server waits out the `Retry-After` once (60 s at most) and
retries. Projects, states, labels, members and the current user are cached for five minutes, shared by every
request the process serves.
