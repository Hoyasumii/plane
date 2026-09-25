---
sidebar_position: 100
title: Contribuindo
---

# Contribuindo

O repositório é o [Hoyasumii/plane](https://github.com/Hoyasumii/plane), gerenciado com pnpm (Node.js 20 ou mais
recente).

```bash
pnpm install          # dependências, mais os git hooks (husky)
pnpm build            # compila para dist/ e empacota dist/types.bundle.d.ts
pnpm dev              # tsc --watch
pnpm test:unit        # testes unitários (não precisam de uma instância do Plane)
pnpm check:lint       # oxlint (`pnpm fix:lint` corrige o que der)
pnpm check:format     # oxfmt, 120 colunas (`pnpm fix:format` reescreve)
pnpm check:knip       # arquivos, exports e dependências sem uso
```

Não há CI: as verificações rodam localmente pelos git hooks. O `pre-commit` roda `check:lint` e `check:format`, o
`commit-msg` roda o commitlint com a configuração conventional (`feat: …`, `fix(mcp): …`), e o `pre-push` roda
`check:types`, `check:knip` e `test:unit`.

## Compilando a partir do código

`pnpm build` roda o `tsc` para `dist/`, empacota as definições de tipo em `dist/types.bundle.d.ts` e compara os
exports desse pacote com `scripts/__fixtures__/types-bundle-exports.snapshot.txt`. Se você mudou os exports
públicos de propósito, atualize o snapshot. Para recompilar do zero:

```bash
pnpm clean            # apaga dist/ e node_modules/
pnpm install
pnpm build
```

Depois de mudar qualquer coisa em `src/api/v2/`, rode `pnpm codegen:mcp` para regenerar o catálogo de métodos que
o servidor MCP lê (`src/mcp/generated/catalog.json`). `src/api/v2/generated/constants.ts` é produzido por
`pnpm codegen:v2` a partir do documento OpenAPI api_v2: nunca edite nenhum dos dois à mão.

Para testar o build localmente, rode `node dist/cli/index.js --help`, ou faça o link com `npm link` e rode
`plane --help`. `npm pack --dry-run` lista exatamente o que seria publicado.

## Testes

Os testes ficam em `tests/unit/` e `tests/e2e/`. Os unitários não precisam de uma instância do Plane. Os de ponta
a ponta precisam de um `.env.test` com ids reais:

```bash
cp env.example .env.test
```

Depois preencha `TEST_WORKSPACE_SLUG`, `TEST_PROJECT_ID`, `TEST_USER_ID`, `TEST_WORK_ITEM_ID`,
`TEST_CUSTOMER_ID` e os outros ids que as suítes pedirem.

```bash
pnpm test                                 # tudo
pnpm test:unit                            # só os testes unitários
pnpm test:e2e                             # só os de ponta a ponta
pnpm test tests/unit/page.test.ts         # um arquivo
```

Os testes rodam um de cada vez, para ficar abaixo do limite de taxa do Plane.

## Como a superfície v2 se mantém honesta

A superfície v2 tem 90 classes de recurso, e nada dela é verificado por amostragem. Varreduras de regras rodam
sobre **todas** as classes, enumeradas a partir do código TypeScript, e cada uma é provada introduzindo a violação
e vendo a varredura apontá-la pelo nome:

| Varredura                    | O que ela recusa                                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| Forma da chamada             | um método que não começa pelos ids de caminho da URL, na ordem do caminho                          |
| `fields` / `expand`          | uma operação que oferece uma projeção que o SDK não expõe                                          |
| Filtros de query             | um `?filter=` que a API aceita e nenhum tipo de params declara                                     |
| `order_by`                   | uma ordenação faltando, ou um tipo de params apontando para o enum de uma operação irmã            |
| Paginação                    | uma metade inalcançável do envelope de paginação, inclusive um `paginate` sem `cursor` para usá-lo |
| Correspondência de operações | um método sem entrada em `operations`, silenciosamente isento de tudo acima                        |
| Solidez da projeção          | um método que aceita `fields` e mesmo assim responde a linha completa                              |
| Roteamento do loader         | um método que devolve linhas numa classe navegável e pula o `load()`                               |
| Caminhos alternativos        | um método que declara um `extraPaths` e o ignora                                                   |
| Buscas                       | um `findBy*` filtrando por algo que a API não filtra                                               |

Duas outras varreduras cobrem a árvore em vez das classes: a **completude das bandas** exige que todo recurso
esteja ligado à raiz que o template da URL dele nomeia (e que nada estranho esteja), e a **completude da
navegação** exige que um recurso que anexa um filho responda linhas navegáveis, com uma propriedade por filho e
nenhuma propriedade encobrindo um campo real. Todo método também verifica a URL exata da requisição contra um
servidor simulado.

A documentação também é verificada. `tests/unit/v2/readme-samples.test.ts` checa os tipos de todo bloco
TypeScript do `README.md`, do `CLAUDE.md`, do `AGENTS.MD` e de toda página deste site, nos dois idiomas, contra o
código do SDK. Também checa as afirmações em prosa que são fatos sobre o repositório: scripts que existem,
caminhos que existem, nomes `v2.` exportados e limites de lote que batem com o kernel.

## Este site

O site fica em `website/`, um pacote do workspace construído com Docusaurus. Os guias são Markdown em
`website/docs/`, a tradução pt-BR os espelha em `website/i18n/pt-BR/`, e a referência da API é gerada a partir
de `src/` pelo TypeDoc a cada build.

```bash
pnpm docs:dev                        # prévia ao vivo, em inglês
pnpm docs:dev --locale pt-BR         # prévia ao vivo, em português
pnpm docs:build                      # os dois idiomas, em website/build/
GIT_USER=<usuario-github> pnpm docs:deploy   # compila e envia para o branch gh-pages
```
