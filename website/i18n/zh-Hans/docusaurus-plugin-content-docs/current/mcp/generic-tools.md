---
sidebar_position: 5
title: 通用工具
description: "plane_resources、plane_describe 和 plane_call：覆盖全部 90 个资源、可调用每个 API v2 方法的三个 MCP 工具。"
---

# 通用工具

有三个工具可以访问 SDK 拥有的每一个 v2 方法，涵盖全部 90 个资源：迭代周期、模块、页面、发布
（release）、计划（initiative）、客户、webhook，以及其他所有资源。它们位于 `src/mcp/tools/generic.ts`
中。

1. **`plane_resources`** 用来查找一个资源。不带 `query` 时，它会列出每一个资源路径及其方法名。带上
   `query`（`"cycle work items"`、`"webhook"`）时，它会显示匹配的资源及其方法签名。
2. **`plane_describe`** 接受一个 `resource` 和一个 `method`，并显示完整的签名：按调用顺序排列的参数
   （包括写入体里的字段）、其中哪些是路径 id、允许的 `fields`/`expand`/`order_by`/过滤器取值，以及一个
   示例性的 `plane_call` 输入。
3. **`plane_call`** 会运行这个方法，并按参数名传入它的参数。

代理眼中的一次典型往返：

```json
{ "tool": "plane_resources", "arguments": { "query": "cycle" } }
{ "tool": "plane_describe", "arguments": { "resource": "workspaces.projects.cycles", "method": "list" } }
{
  "tool": "plane_call",
  "arguments": {
    "resource": "workspaces.projects.cycles",
    "method": "list",
    "args": { "slug": "acme", "project": "ENG", "params": { "per_page": 20 } }
  }
}
```

## `plane_call`

| 输入       | 含义                                                                                |
| ---------- | ----------------------------------------------------------------------------------- |
| `resource` | 用点分隔的资源路径，例如 `workspaces.projects.states`                               |
| `method`   | 方法名，例如 `list`、`create`、`add`                                                |
| `args`     | 按参数名给出的参数：先是路径 id（`slug`、`project`……），然后是 `data`/`params` 对象 |
| `limit`    | 用于 `iterate` 方法：要收集多少条（默认 100，最多 1000）                            |
| `confirm`  | 运行一个破坏性方法时必须是 `true`                                                   |

`slug` 默认使用已配置的工作区。列表 `params` 接受 `fields`、过滤器、`order_by`、`per_page` 和 `offset`。
超过 60,000 个字符的结果会被截断，并带有说明这一点的备注。

**破坏性方法**（`delete`、`bulkDelete`、`remove`、`unlink`）在没有 `confirm: true` 时会拒绝运行。该工具
的描述会告诉代理先去询问用户。

## 目录（catalog）

通用工具读取的是 `src/mcp/generated/catalog.json`：资源路径、按调用顺序排列的参数名，以及来自 api_v2
OpenAPI 文档的允许值。它是由 `pnpm codegen:mcp` 从 SDK 源码生成的，绝不手动编辑。

`plane_call` 只能访问目录里的方法，并按目录声明的参数名来排列具名参数的顺序。在没有 API v2 的实例上，
`plane_resources` 和 `plane_call` 会拒绝执行，并给出一条指向那些类型化工具的消息；`plane_describe` 仍
然可以工作，因为它只读取目录。
