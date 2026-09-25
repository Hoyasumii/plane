# Contributing

Thanks for helping. The full guide — building from source, the tests, how the v2 surface is checked, and the docs
site — is at <https://hoyasumii.github.io/plane/docs/contributing>. The short version:

- You need Node.js 20 or later and pnpm. Run `pnpm install` first: it also installs the git hooks. There is no CI,
  so the hooks are the only checks a change goes through. `pre-commit` runs `check:lint` and
  `check:format`, and `pre-push` runs `check:types`, `check:knip` and `test:unit`.
- Commit messages follow Conventional Commits (`feat: …`, `fix(mcp): …`), enforced by commitlint.
- After touching `src/api/v2/`, run `pnpm codegen:mcp`. Never edit `src/api/v2/generated/constants.ts` or
  `src/mcp/generated/catalog.json` by hand.
- A docs change goes in both languages: `website/docs/` and its pt-BR mirror under
  `website/i18n/pt-BR/docusaurus-plugin-content-docs/current/`.
- Say "work item", never "issue", in names.

Report security problems privately, as [SECURITY.md](SECURITY.md) describes, and not in a public issue.
Everyone taking part is expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
