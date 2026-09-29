---
sidebar_position: 100
title: Mitwirken
description: "Das Repository einrichten, die Checks und Tests ausführen und diese Dokumentationsseite bauen und in der Vorschau ansehen."
---

# Mitwirken

Das Repository ist [Hoyasumii/plane](https://github.com/Hoyasumii/plane), verwaltet mit pnpm (Node.js 20 oder
neuer).

```bash
pnpm install          # Abhängigkeiten, dazu die Git-Hooks (husky)
pnpm build            # nach dist/ kompilieren und dist/types.bundle.d.ts bündeln
pnpm dev              # tsc --watch
pnpm test:unit        # Unit-Tests (keine Plane-Instanz nötig)
pnpm check:lint       # oxlint (`pnpm fix:lint` behebt, was es kann)
pnpm check:format     # oxfmt, 120 Spalten (`pnpm fix:format` schreibt um)
pnpm check:knip       # ungenutzte Dateien, Exporte und Abhängigkeiten
```

Es gibt keine CI: Die Prüfungen laufen lokal über Git-Hooks. `pre-commit` führt `check:lint` und `check:format`
aus, `commit-msg` führt commitlint mit der konventionellen Konfiguration aus (`feat: …`, `fix(mcp): …`), und
`pre-push` führt `check:types`, `check:knip` und `test:unit` aus.

Nach einem Push von `main` nach `origin`, der `website/` oder `src/` berührt, startet `pre-push` außerdem
`scripts/deploy-site.mjs` im Hintergrund. Es wartet, bis der Push angekommen ist, checkt den gepushten Commit in
einem eigenen Worktree aus und führt dort `pnpm docs:deploy` aus, sodass die Site `main` folgt, ohne den Push
aufzuhalten. Das Log liegt unter `site-deploy/deploy.log` im Git-Verzeichnis; `PLANE_SKIP_SITE_DEPLOY=1` überspringt es für einen Push.

## Aus dem Quellcode bauen

`pnpm build` führt `tsc` nach `dist/` aus, bündelt die Typdefinitionen in `dist/types.bundle.d.ts` und vergleicht
die Exporte dieses Bundles mit `scripts/__fixtures__/types-bundle-exports.snapshot.txt`. Wenn du die öffentlichen
Exporte absichtlich geändert hast, aktualisiere den Snapshot. Für einen sauberen Rebuild:

```bash
pnpm clean            # löscht dist/ und node_modules/
pnpm install
pnpm build
```

Führe nach jeder Änderung unter `src/api/v2/` `pnpm codegen:mcp` aus, um den Methodenkatalog neu zu erzeugen,
den der MCP-Server liest (`src/mcp/generated/catalog.json`). `src/api/v2/generated/constants.ts` wird von
`pnpm codegen:v2` aus dem api_v2-OpenAPI-Dokument erzeugt: Bearbeite keines der beiden von Hand.

Um den Build lokal auszuprobieren, führe `node dist/cli/index.js --help` aus, oder verlinke ihn mit `npm link`
und führe `plane --help` aus. `npm pack --dry-run` listet genau das auf, was veröffentlicht würde.

## Tests

Tests liegen in `tests/unit/` und `tests/e2e/`. Die Unit-Tests brauchen keine Plane-Instanz. Die End-to-End-Tests
brauchen eine `.env.test` mit echten IDs:

```bash
cp env.example .env.test
```

Trage dann `TEST_WORKSPACE_SLUG`, `TEST_PROJECT_ID`, `TEST_USER_ID`, `TEST_WORK_ITEM_ID`, `TEST_CUSTOMER_ID` und
die anderen IDs ein, die die Suiten verlangen.

```bash
pnpm test                                 # alles
pnpm test:unit                            # nur Unit-Tests
pnpm test:e2e                             # nur End-to-End-Tests
pnpm test tests/unit/page.test.ts         # eine Datei
```

Die Tests laufen einzeln nacheinander, um innerhalb von Planes Ratenlimit zu bleiben.

## Wie die v2-Oberfläche ehrlich gehalten wird

Die v2-Oberfläche besteht aus 90 Ressourcenklassen, und nichts davon wird stichprobenhaft geprüft. Regel-Sweeps
laufen über **jede** Klasse, aus dem TypeScript-Quellcode aufgelistet, und jeder wird bewiesen, indem der Verstoß
eingebaut und beobachtet wird, wie der Sweep ihn benennt:

| Sweep                  | Was er verweigert                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| Aufrufform             | eine Methode, die nicht mit den Path-IDs ihrer URL beginnt, in Pfadreihenfolge                                |
| `fields` / `expand`    | eine Operation, die eine Projektion anbietet, die das SDK nicht bereitstellt                                  |
| Query-Filter           | ein `?filter=`, das die API akzeptiert und kein Params-Typ deklariert                                         |
| `order_by`             | eine fehlende Sortierreihenfolge oder ein Params-Typ, der auf das Enum eines anderen Elements zeigt           |
| Pagination             | eine unerreichbare Hälfte der Paging-Hülle — einschließlich eines `paginate` ohne `cursor`, um ihn einzulösen |
| Operationszuordnung    | eine Methode ohne `operations`-Eintrag, die dadurch stillschweigend von allem Obigen befreit ist              |
| Projektionskorrektheit | eine Methode, die `fields` akzeptiert und trotzdem die vollständige Zeile beantwortet                         |
| Loader-Routing         | eine zeilenliefernde Methode einer navigierbaren Klasse, die `load()` überspringt                             |
| Alternative Pfade      | eine Methode, die eine `extraPaths`-Überschreibung deklariert und sie ignoriert                               |
| Lookups                | ein `findBy*`, das nach etwas filtert, wonach die API nicht filtert                                           |

Zwei weitere Sweeps decken den Baum ab statt der Klassen: **Band-Vollständigkeit** verlangt, dass jede Ressource
an der Wurzel angehängt ist, die ihr URL-Template benennt (und nichts Fremdes es ist), und
**Navigationsvollständigkeit** verlangt, dass eine Ressource, die ein Kind anhängt, navigierbare Zeilen liefert,
mit einer Eigenschaft pro Kind und keiner Eigenschaft, die ein echtes Feld überdeckt. Jede Methode prüft
außerdem ihre exakte Anfrage-URL gegen einen Mock-Server.

Die Dokumentation wird ebenfalls geprüft. `tests/unit/v2/readme-samples.test.ts` prüft jeden TypeScript-Codeblock
in `README.md`, `CLAUDE.md`, `AGENTS.MD` und jeder Seite dieser Website, in jeder Sprache, gegen den SDK-
Quellcode. Es prüft außerdem die Aussagen im Fließtext, die Tatsachen über das Repository sind: Skripte, die
existieren, Pfade, die existieren, `v2.`-Namen, die exportiert werden, und Batch-Obergrenzen, die zum Kernel
passen.

## Diese Website

Die Website liegt in `website/`, einem Workspace-Paket, das mit Docusaurus gebaut ist. Die Anleitungen sind
Markdown in `website/docs/`, jede Übersetzung spiegelt sie in `website/i18n/<locale>/`, und die API-Referenz
wird bei jedem Build von TypeDoc aus `src/` erzeugt.

```bash
pnpm docs:dev                        # Live-Vorschau, auf Englisch
pnpm docs:dev --locale pt-BR         # Live-Vorschau in einer anderen Sprache (pt-PT, es-ES, zh-Hans, …)
pnpm docs:build                      # alle Sprachen, nach website/build/
GIT_USER=<github-benutzer> pnpm docs:deploy   # baut und pusht in den Branch gh-pages
```

Die Suche (Ctrl/Cmd+K) nutzt einen Offline-Index pro Sprache, den `pnpm docs:build` schreibt; unter
`pnpm docs:dev` funktioniert sie nicht, probiere sie also nach einem Build mit `pnpm docs:serve` aus. Die
API-Referenz bleibt aus dem Index heraus. Der englische Build schreibt außerdem `llms.txt` und `llms-full.txt` in
das Wurzelverzeichnis der Website, aus den englischen Anleitungen, damit KI-Tools sie lesen können. Beide sind
Build-Ausgabe: niemals committen und niemals von Hand schreiben.
