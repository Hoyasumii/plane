---
sidebar_position: 100
title: 贡献指南
description: "搭建仓库、运行检查与测试，并构建和预览本文档站点。"
---

# 贡献指南

仓库地址是 [Hoyasumii/plane](https://github.com/Hoyasumii/plane)，使用 pnpm 管理（需要 Node.js 20 或更高
版本）。

```bash
pnpm install          # 安装依赖，同时安装 git 钩子（husky）
pnpm build            # 编译到 dist/，并打包 dist/types.bundle.d.ts
pnpm dev              # tsc --watch
pnpm test:unit        # 单元测试（不需要 Plane 实例）
pnpm check:lint       # oxlint（`pnpm fix:lint` 能修复的会自动修复）
pnpm check:format     # oxfmt，120 列宽（`pnpm fix:format` 会重写）
pnpm check:knip       # 未使用的文件、导出和依赖
```

所有检查都通过 git 钩子在本地运行。`pre-commit` 运行 `check:lint` 和 `check:format`，
`commit-msg` 使用约定式配置运行 commitlint（`feat: …`、`fix(mcp): …`），`pre-push` 运行 `check:types`、
`check:knip` 和 `test:unit`。

每次推送到 `main` 都会运行持续交付工作流（`.github/workflows/cd.yml`）。它运行相同的检查和构建，然后：

- 当 `package.json` 中的版本尚未发布到 npm 时，通过 Trusted Publishing（附带 provenance）发布该版本，打上
  `v<版本>` 标签并创建 GitHub release；
- 当推送改动了 `website/` 或 `src/` 时，构建站点并部署到 `gh-pages` 分支（手动运行该工作流时总会部署）。

要发布新版本，只需提高 `package.json` 中的 `version` 并合并到 `main`。

## 从源码构建

`pnpm build` 会把 `tsc` 编译到 `dist/`，将类型定义打包进 `dist/types.bundle.d.ts`，并把这个打包结果的导出
与 `scripts/__fixtures__/types-bundle-exports.snapshot.txt` 进行比对。如果你有意更改了公共导出，请更新
这份快照。要做一次干净的重新构建：

```bash
pnpm clean            # 删除 dist/ 和 node_modules/
pnpm install
pnpm build
```

在改动 `src/api/v2/` 下的任何内容之后，运行 `pnpm codegen:mcp` 来重新生成 MCP 服务器读取的方法目录
（`src/mcp/generated/catalog.json`）。`src/api/v2/generated/constants.ts` 是由 `pnpm codegen:v2` 从
api_v2 OpenAPI 文档生成的：这两个文件都不要手动编辑。

要在本地试跑构建结果，运行 `node dist/cli/index.js --help`，或者用 `npm link` 链接它，然后运行
`plane --help`。`npm pack --dry-run` 会准确列出将要发布的内容。

## 测试

测试位于 `tests/unit/` 和 `tests/e2e/` 中。单元测试不需要 Plane 实例。端到端测试需要一个带有真实 id 的
`.env.test`：

```bash
cp env.example .env.test
```

然后填写 `TEST_WORKSPACE_SLUG`、`TEST_PROJECT_ID`、`TEST_USER_ID`、`TEST_WORK_ITEM_ID`、`TEST_CUSTOMER_ID`，
以及各个测试套件要求的其他 id。

```bash
pnpm test                                 # 全部
pnpm test:unit                            # 仅单元测试
pnpm test:e2e                             # 仅端到端测试
pnpm test tests/unit/page.test.ts         # 单个文件
```

测试是逐个串行运行的，以避免超出 Plane 的速率限制。

## v2 表面是如何被确保可信的

v2 表面有 90 个资源类，没有一个是抽查的。规则扫描会遍历**每一个**类——这些类是从 TypeScript 源码中枚举
出来的——并且每一条规则都通过引入违规、观察扫描按名字指出它来加以证明：

| 扫描                | 它会拒绝什么                                                      |
| ------------------- | ----------------------------------------------------------------- |
| 调用形态            | 一个方法没有以其 URL 的路径 id、按路径顺序开头                    |
| `fields` / `expand` | 一个操作提供了 SDK 未暴露的投影                                   |
| 查询过滤器          | 一个 API 接受、却没有任何 params 类型声明的 `?filter=`            |
| `order_by`          | 缺失的排序方式，或者指向了兄弟操作枚举的 params 类型              |
| 分页                | 分页信封中不可达的那一半——包括一个没有 `cursor` 可用的 `paginate` |
| 操作对应关系        | 一个没有 `operations` 条目的方法，从而悄悄豁免于以上所有检查      |
| 投影正确性          | 一个接受 `fields` 却仍然返回完整行的方法                          |
| 加载器路由          | 可导航类上一个跳过了 `load()` 的、会返回行的方法                  |
| 备用路径            | 一个声明了 `extraPaths` 覆盖却又不使用它的方法                    |
| 查找                | 一个 `findBy*` 按 API 不支持过滤的字段进行过滤                    |

还有两项扫描覆盖的是整棵树而不是单个类：**band 完整性**要求每个资源都挂载在其 URL 模板所指明的根上（并且
没有外来资源挂在上面）；**导航完整性**要求挂载了子资源的资源要返回可导航的行，每个子资源对应一个属性，
并且没有属性会遮蔽真实字段。每个方法还会针对一个模拟服务器断言自己确切的请求 URL。

文档同样会被检查。`tests/unit/v2/readme-samples.test.ts` 会针对 SDK 源码，对 `README.md`、`CLAUDE.md`、
`AGENTS.MD`，以及本站每种语言下的每一页中的每一个 TypeScript 代码块做类型检查。它还会检查文字中那些属于
本仓库事实性陈述的内容：确实存在的脚本、确实存在的路径、确实导出的 `v2.` 名称，以及与内核相符的批量上限。

## 本站点

本站点位于 `website/` 中，是一个用 Docusaurus 构建的工作区包。指南是 `website/docs/` 中的 Markdown 文件，
每种语言的翻译都在 `website/i18n/<locale>/` 中对它们进行镜像，API 参考则是在每次构建时由 TypeDoc 从
`src/` 生成的。

```bash
pnpm docs:dev                        # 实时预览，英文
pnpm docs:dev --locale pt-BR         # 以另一种语言实时预览（pt-PT、es-ES、zh-Hans、…）
pnpm docs:build                      # 构建所有语言，输出到 website/build/
GIT_USER=<github-user> pnpm docs:deploy   # 构建并推送到 gh-pages 分支
```

搜索（Ctrl/Cmd+K）基于 `pnpm docs:build` 生成的离线索引，每种语言一个；它在 `pnpm docs:dev` 下不可用，
请在构建后用 `pnpm docs:serve` 试用。API 参考不在索引中。英文构建还会在站点根目录根据英文指南生成 `llms.txt` 和
`llms-full.txt`，供 AI 工具读取。二者都是构建产物：切勿提交，也切勿手写。
