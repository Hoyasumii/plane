---
sidebar_position: 100
title: Contribuir
description: "Prepare o repositório, execute as verificações e os testes, e compile e pré-visualize este site de documentação."
---

# Contribuir

O repositório é o [Hoyasumii/plane](https://github.com/Hoyasumii/plane), gerido com pnpm (Node.js 20 ou mais
recente).

```bash
pnpm install          # dependências, mais os git hooks (husky)
pnpm build            # compila para dist/ e empacota dist/types.bundle.d.ts
pnpm dev              # tsc --watch
pnpm test:unit        # testes unitários (não é preciso uma instância do Plane)
pnpm check:lint       # oxlint (o `pnpm fix:lint` corrige o que conseguir)
pnpm check:format     # oxfmt, 120 colunas (o `pnpm fix:format` reescreve)
pnpm check:knip       # ficheiros, exports e dependências sem utilização
```

Não há CI: as verificações correm localmente através dos git hooks. O `pre-commit` corre `check:lint` e
`check:format`, o `commit-msg` corre o commitlint com a configuração conventional (`feat: …`, `fix(mcp): …`), e o
`pre-push` corre `check:types`, `check:knip` e `test:unit`.

Depois de um push da `main` para o `origin` que altere `website/` ou `src/`, o `pre-push` inicia também
o `scripts/deploy-site.mjs` em segundo plano. Este espera que o push chegue, faz checkout do commit enviado numa
worktree própria e corre `pnpm docs:deploy` nela, pelo que o site acompanha a `main` sem atrasar o push. O registo
fica em `site-deploy/deploy.log`, dentro do diretório do git; `PLANE_SKIP_SITE_DEPLOY=1` salta o deploy num push.

## A compilar a partir do código-fonte

`pnpm build` corre o `tsc` para `dist/`, empacota as definições de tipos em `dist/types.bundle.d.ts` e compara os
exports desse pacote com `scripts/__fixtures__/types-bundle-exports.snapshot.txt`. Se tiver alterado os exports
públicos de propósito, atualize o snapshot. Para recompilar do zero:

```bash
pnpm clean            # apaga dist/ e node_modules/
pnpm install
pnpm build
```

Depois de alterar alguma coisa em `src/api/v2/`, corra o `pnpm codegen:mcp` para regenerar o catálogo de métodos
que o servidor MCP lê (`src/mcp/generated/catalog.json`). `src/api/v2/generated/constants.ts` é produzido pelo
`pnpm codegen:v2` a partir do documento OpenAPI api_v2: nunca edite nenhum dos dois à mão.

Para testar o build localmente, corra `node dist/cli/index.js --help`, ou faça a ligação com `npm link` e corra
`plane --help`. `npm pack --dry-run` lista exatamente o que seria publicado.

## Testes

Os testes ficam em `tests/unit/` e `tests/e2e/`. Os unitários não precisam de uma instância do Plane. Os de ponta
a ponta precisam de um `.env.test` com ids reais:

```bash
cp env.example .env.test
```

Depois preencha `TEST_WORKSPACE_SLUG`, `TEST_PROJECT_ID`, `TEST_USER_ID`, `TEST_WORK_ITEM_ID`,
`TEST_CUSTOMER_ID` e os outros ids que os conjuntos de testes pedirem.

```bash
pnpm test                                 # tudo
pnpm test:unit                            # só os testes unitários
pnpm test:e2e                             # só os de ponta a ponta
pnpm test tests/unit/page.test.ts         # um ficheiro
```

Os testes correm um de cada vez, para ficar abaixo do limite de taxa do Plane.

## Como a superfície v2 se mantém honesta

A superfície v2 tem 90 classes de recurso, e nenhuma delas é verificada por amostragem. As varreduras de regras
correm sobre **todas** as classes, enumeradas a partir do código TypeScript, e cada uma é provada ao introduzir a
violação e ver a varredura apontá-la pelo nome:

| Varredura                    | O que recusa                                                                                         |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| Forma da chamada             | um método que não começa pelos ids de caminho do URL, pela ordem do caminho                          |
| `fields` / `expand`          | uma operação que oferece uma projeção que o SDK não expõe                                            |
| Filtros de query             | um `?filter=` que a API aceita e que nenhum tipo de params declara                                   |
| `order_by`                   | uma ordenação em falta, ou um tipo de params a apontar para o enum de uma operação irmã              |
| Paginação                    | uma metade inalcançável do envelope de paginação, incluindo um `paginate` sem `cursor` para o gastar |
| Correspondência de operações | um método sem entrada em `operations`, isento em silêncio de tudo o que precede                      |
| Solidez da projeção          | um método que aceita `fields` e, mesmo assim, responde com a linha completa                          |
| Encaminhamento do loader     | um método que devolve linhas numa classe navegável e ignora o `load()`                               |
| Caminhos alternativos        | um método que declara um `extraPaths` e o ignora                                                     |
| Procuras                     | um `findBy*` a filtrar por algo que a API não filtra                                                 |

Duas outras varreduras cobrem a árvore em vez das classes: a **completude das bandas** exige que todo o recurso
esteja ligado à raiz que o respetivo template de URL nomeia (e que nada estranho esteja), e a **completude da
navegação** exige que um recurso que anexa um filho responda com linhas navegáveis, com uma propriedade por filho
e nenhuma propriedade a encobrir um campo real. Todo o método também verifica o URL exato do pedido contra um
servidor simulado.

A documentação também é verificada. O `tests/unit/v2/readme-samples.test.ts` verifica os tipos de todos os
blocos de TypeScript do `README.md`, do `CLAUDE.md`, do `AGENTS.MD` e de todas as páginas deste site, em todos os
idiomas, em relação ao código do SDK. Também verifica as afirmações em prosa que são factos sobre o repositório:
scripts que existem, caminhos que existem, nomes `v2.` exportados e limites de lote que correspondem ao kernel.

## Este site

O site fica em `website/`, um pacote do workspace construído com Docusaurus. Os guias são Markdown em
`website/docs/`, e cada tradução espelha-os em `website/i18n/<locale>/`, sendo a referência da API gerada a
partir de `src/` pelo TypeDoc em cada build.

```bash
pnpm docs:dev                        # pré-visualização em direto, em inglês
pnpm docs:dev --locale pt-BR         # pré-visualização em direto noutro idioma (pt-PT, es-ES, zh-Hans, …)
pnpm docs:build                      # todos os idiomas, em website/build/
GIT_USER=<github-user> pnpm docs:deploy   # compila e envia para o branch gh-pages
```

A pesquisa (Ctrl/Cmd+K) usa um índice offline, um por idioma, que o `pnpm docs:build` gera; não funciona no
`pnpm docs:dev`, por isso experimente-a com `pnpm docs:serve` depois de um build. A referência da API fica fora do
índice. O build em inglês também gera `llms.txt` e `llms-full.txt` na raiz do site, a partir dos guias em inglês,
para ferramentas de IA lerem. Ambos são resultado do build: nunca os faça commit nem os escreva à mão.
