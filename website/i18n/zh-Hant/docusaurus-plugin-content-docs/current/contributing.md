---
sidebar_position: 100
title: 貢獻指南
description: "建置儲存庫、執行檢查與測試，並建置與預覽本文件網站。"
---

# 貢獻指南

倉庫地址是 [Hoyasumii/plane](https://github.com/Hoyasumii/plane)，使用 pnpm 管理（需要 Node.js 20 或更高
版本）。

```bash
pnpm install          # 安裝依賴，同時安裝 git 鉤子（husky）
pnpm build            # 編譯到 dist/，並打包 dist/types.bundle.d.ts
pnpm dev              # tsc --watch
pnpm test:unit        # 單元測試（不需要 Plane 例項）
pnpm check:lint       # oxlint（`pnpm fix:lint` 能修復的會自動修復）
pnpm check:format     # oxfmt，120 列寬（`pnpm fix:format` 會重寫）
pnpm check:knip       # 未使用的檔案、匯出和依賴
```

所有檢查都透過 git 鉤子在本地執行。`pre-commit` 執行 `check:lint` 和 `check:format`，
`commit-msg` 使用約定式配置執行 commitlint（`feat: …`、`fix(mcp): …`），`pre-push` 執行 `check:types`、
`check:knip` 和 `test:unit`。

每次推送到 `main` 都會執行持續交付工作流程（`.github/workflows/cd.yml`）。它執行相同的檢查和建置，然後：

- 當 `package.json` 中的版本尚未發布到 npm 時，透過 Trusted Publishing（附帶 provenance）發布該版本，加上
  `v<版本>` 標籤並建立 GitHub release；
- 當推送變更了 `website/` 或 `src/` 時，建置網站並部署到 `gh-pages` 分支（手動執行該工作流程時一律部署）。

要發布新版本，只需提高 `package.json` 中的 `version` 並合併到 `main`。

## 從原始碼構建

`pnpm build` 會把 `tsc` 編譯到 `dist/`，將型別定義打包進 `dist/types.bundle.d.ts`，並把這個打包結果的匯出
與 `scripts/__fixtures__/types-bundle-exports.snapshot.txt` 進行比對。如果你有意更改了公共匯出，請更新
這份快照。要做一次乾淨的重新構建：

```bash
pnpm clean            # 刪除 dist/ 和 node_modules/
pnpm install
pnpm build
```

在改動 `src/api/v2/` 下的任何內容之後，執行 `pnpm codegen:mcp` 來重新生成 MCP 伺服器讀取的方法目錄
（`src/mcp/generated/catalog.json`）。`src/api/v2/generated/constants.ts` 是由 `pnpm codegen:v2` 從
api_v2 OpenAPI 文件生成的：這兩個檔案都不要手動編輯。

要在本地試跑構建結果，執行 `node dist/cli/index.js --help`，或者用 `npm link` 連結它，然後執行
`plane --help`。`npm pack --dry-run` 會準確列出將要釋出的內容。

## 測試

測試位於 `tests/unit/` 和 `tests/e2e/` 中。單元測試不需要 Plane 例項。端到端測試需要一個帶有真實 id 的
`.env.test`：

```bash
cp env.example .env.test
```

然後填寫 `TEST_WORKSPACE_SLUG`、`TEST_PROJECT_ID`、`TEST_USER_ID`、`TEST_WORK_ITEM_ID`、`TEST_CUSTOMER_ID`，
以及各個測試套件要求的其他 id。

```bash
pnpm test                                 # 全部
pnpm test:unit                            # 僅單元測試
pnpm test:e2e                             # 僅端到端測試
pnpm test tests/unit/page.test.ts         # 單個檔案
```

測試是逐個序列執行的，以避免超出 Plane 的速率限制。

## v2 表面是如何被確保可信的

v2 表面有 90 個資源類，沒有一個是抽查的。規則掃描會遍歷**每一個**類——這些類是從 TypeScript 原始碼中列舉
出來的——並且每一條規則都透過引入違規、觀察掃描按名字指出它來加以證明：

| 掃描                | 它會拒絕什麼                                                      |
| ------------------- | ----------------------------------------------------------------- |
| 呼叫形態            | 一個方法沒有以其 URL 的路徑 id、按路徑順序開頭                    |
| `fields` / `expand` | 一個操作提供了 SDK 未暴露的投影                                   |
| 查詢過濾器          | 一個 API 接受、卻沒有任何 params 型別宣告的 `?filter=`            |
| `order_by`          | 缺失的排序方式，或者指向了兄弟操作列舉的 params 型別              |
| 分頁                | 分頁信封中不可達的那一半——包括一個沒有 `cursor` 可用的 `paginate` |
| 操作對應關係        | 一個沒有 `operations` 條目的方法，從而悄悄豁免於以上所有檢查      |
| 投影正確性          | 一個接受 `fields` 卻仍然返回完整行的方法                          |
| 載入器路由          | 可導航類上一個跳過了 `load()` 的、會返回行的方法                  |
| 備用路徑            | 一個宣告瞭 `extraPaths` 覆蓋卻又不使用它的方法                    |
| 查詢                | 一個 `findBy*` 按 API 不支援過濾的欄位進行過濾                    |

還有兩項掃描覆蓋的是整棵樹而不是單個類：**band 完整性**要求每個資源都掛載在其 URL 模板所指明的根上（並且
沒有外來資源掛在上面）；**導航完整性**要求掛載了子資源的資源要返回可導航的行，每個子資源對應一個屬性，
並且沒有屬性會遮蔽真實欄位。每個方法還會針對一個模擬伺服器斷言自己確切的請求 URL。

文件同樣會被檢查。`tests/unit/v2/readme-samples.test.ts` 會針對 SDK 原始碼，對 `README.md`、`CLAUDE.md`、
`AGENTS.MD`，以及本站每種語言下的每一頁中的每一個 TypeScript 程式碼塊做型別檢查。它還會檢查文字中那些屬於
本倉庫事實性陳述的內容：確實存在的指令碼、確實存在的路徑、確實匯出的 `v2.` 名稱，以及與核心相符的批次上限。

## 本站點

本站點位於 `website/` 中，是一個用 Docusaurus 構建的工作區包。指南是 `website/docs/` 中的 Markdown 檔案，
每種語言的翻譯都在 `website/i18n/<locale>/` 中對它們進行映象，API 參考則是在每次構建時由 TypeDoc 從
`src/` 生成的。

```bash
pnpm docs:dev                        # 實時預覽，英文
pnpm docs:dev --locale pt-BR         # 以另一種語言實時預覽（pt-PT、es-ES、zh-Hans、…）
pnpm docs:build                      # 構建所有語言，輸出到 website/build/
GIT_USER=<github-user> pnpm docs:deploy   # 構建並推送到 gh-pages 分支
```

搜尋（Ctrl/Cmd+K）使用 `pnpm docs:build` 產生的離線索引，每種語言一個；它在 `pnpm docs:dev` 下無法使用，
請在建置後以 `pnpm docs:serve` 試用。API 參考不在索引中。英文建置也會在網站根目錄依英文指南產生 `llms.txt` 與
`llms-full.txt`，供 AI 工具讀取。兩者都是建置產物：切勿提交，也切勿手寫。
