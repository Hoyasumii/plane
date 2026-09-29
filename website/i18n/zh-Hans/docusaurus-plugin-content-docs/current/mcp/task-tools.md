---
sidebar_position: 3
title: 任务工具
description: "MCP 任务工具：按键操作任务，按名称操作项目、状态、标签和成员，并输出易读的结果。"
---

# 任务工具

这些工具是任务驱动型代理工作流所依赖的稳定契约。它们按键（`ACME-130`）来处理任务，按名称来处理项目、状
态、标签和成员，并返回不带 id 的可读输出。它们位于 `src/mcp/tools/kit.ts` 中。

每个工具都接受一个可选的 `slug`（工作区）。配置了默认工作区（`PLANE_WORKSPACE`）之后，它在任何地方都可
以省略。

| 工具                     | 作用                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------- |
| `plane_whoami`           | 这个密钥对应的用户、工作区、base URL，以及这个实例提供的 API 版本（`v1`/`v2`）          |
| `plane_list_projects`    | 工作区中的项目，带有用在键里的那个标识符                                                |
| `plane_list_my_issues`   | 分配给我的任务（默认只显示未完成的），可以是一个项目里的，也可以是所有项目里的          |
| `plane_search_issues`    | 按文本、按经办人和按状态分组来搜索一个项目里的任务                                      |
| `plane_get_issue`        | 一个任务：状态与分组、优先级、按名字给出的经办人与标签、日期、`url`，以及作为文本的描述 |
| `plane_get_issue_images` | 把描述中的图片下载为 `image-<n>.<ext>`（默认在 `<tmp>/plane-mcp/<KEY>/` 下）            |
| `plane_list_comments`    | 一个任务的评论，按时间从旧到新：作者、日期、正文                                        |
| `plane_add_comment`      | 以这个密钥对应的用户身份发表评论                                                        |
| `plane_create_issue`     | 创建一个任务，按名字写入状态、标签和经办人                                              |
| `plane_update_issue`     | 只修改给出的那些字段                                                                    |
| `plane_list_states`      | 这个项目的状态，带有它们所属的分组                                                      |
| `plane_list_labels`      | 这个项目的标签                                                                          |
| `plane_list_members`     | 可以被指派的人：显示名和邮箱                                                            |

这些工具都不会删除任何东西。

## 输入

| 工具                                                             | 输入（除了 `slug` 之外）                                                                                                   |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `plane_list_my_issues`                                           | `project?`、`state_groups?`（默认：backlog、unstarted、started）、`limit`（1–200，默认 50）                                |
| `plane_search_issues`                                            | `project`、`query?`、`assignee?`（名字、邮箱或 `"me"`）、`state_groups?`、`limit`（1–200，默认 30）                        |
| `plane_get_issue`                                                | `key`                                                                                                                      |
| `plane_get_issue_images`                                         | `key`、`dir?`（一个绝对路径的文件夹，缺失时会被创建）                                                                      |
| `plane_list_comments`                                            | `key`                                                                                                                      |
| `plane_add_comment`                                              | `key`、`text`、`format`（`"text"`，默认，或者 `"markdown"`）                                                               |
| `plane_create_issue`                                             | `project`、`title`、`description?`、`state?`、`priority?`、`assignees?`、`labels?`、`start_date?`、`target_date?`          |
| `plane_update_issue`                                             | `key`，再加上 `title`、`description`、`state`、`priority`、`assignees`、`labels`、`start_date`、`target_date` 中的任意几个 |
| `plane_list_states` / `plane_list_labels` / `plane_list_members` | `project`                                                                                                                  |

状态分组是 `backlog`、`unstarted`、`started`、`completed` 和 `cancelled`。优先级是 `urgent`、`high`、
`medium`、`low` 和 `none`。日期格式是 `YYYY-MM-DD`。

## 名字是如何被解析的

- **项目**：按标识符（`ACME`）、名字或 id。
- **状态**和**标签**：在任务所属的项目内，按名字。
- **成员**：按 `"me"`、邮箱、显示名、全名或 id。

一个什么都匹配不上的值会连同一份合法选项的清单一起失败，这样代理就可以自我纠正。

## 写入

- `plane_create_issue` 会把任务指派给这个密钥对应的用户，除非给出了 `assignees`（`[]` 表示谁都不指派）。
- 在 `plane_update_issue` 中，`assignees` 和 `labels` 会替换掉整个列表，`description` 会替换掉整段描
  述，一个 `null` 日期会清除它。完全不传任何字段是一个错误。
- `description` 是纯文本：每一行会变成一个段落。
- 在 `plane_add_comment` 中，`format: "text"` 会让每一行变成一个段落；`format: "markdown"` 会渲染 GFM
  （标题、列表、复选框、粗体）并对原始 HTML 进行转义。

## 图片

在 `plane_get_issue` 中，描述里的每一张图片都会变成文本中的一个 `[image n]` 标记，并列在 `images` 里。
`plane_get_issue_images` 会按同样的顺序把它们保存为 `image-<n>.<ext>`，这样代理就可以用它自己的文件读
取工具打开它们。它会从文件签名里检测类型，并把每个文件的大小上限设为 20 MB。一张失败或者外部的图片不会
阻止其他图片被处理。

在 Plane 1.4.2 上，文档记载的那个资产下载接口（`GET /workspaces/<ws>/assets/<id>/`）会返回 500。因此服
务器改为调用 `client.workItems.attachments.download`，它会从附件详情里读取重定向，并跟随那个签名 URL，
而不会发送 API 密钥。

## 速率限制与缓存

Plane 允许每分钟 60 次请求。遇到 `429` 时，服务器会等待一次 `Retry-After`（最多 60 秒）然后重试。项目、
状态、标签、成员和当前用户会被缓存五分钟，由这个进程处理的每一个请求共享。
