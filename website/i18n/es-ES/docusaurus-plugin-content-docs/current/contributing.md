---
sidebar_position: 100
title: Contribuir
description: "Prepara el repositorio, ejecuta las comprobaciones y las pruebas, y compila y previsualiza este sitio de documentación."
---

# Contribuir

El repositorio es [Hoyasumii/plane](https://github.com/Hoyasumii/plane), gestionado con pnpm (Node.js 20 o una
versión posterior).

```bash
pnpm install          # dependencias, más los git hooks (husky)
pnpm build            # compila a dist/ y empaqueta dist/types.bundle.d.ts
pnpm dev              # tsc --watch
pnpm test:unit        # tests unitarios (no necesita una instancia de Plane)
pnpm check:lint       # oxlint (`pnpm fix:lint` corrige lo que puede)
pnpm check:format     # oxfmt, 120 columnas (`pnpm fix:format` reescribe)
pnpm check:knip       # archivos, exports y dependencias sin usar
```

No hay CI: las comprobaciones se ejecutan en local mediante git hooks. `pre-commit` ejecuta `check:lint` y
`check:format`, `commit-msg` ejecuta commitlint con la configuración convencional (`feat: …`, `fix(mcp): …`), y
`pre-push` ejecuta `check:types`, `check:knip` y `test:unit`.

## Compilar desde el código fuente

`pnpm build` ejecuta `tsc` hacia `dist/`, empaqueta las definiciones de tipos en `dist/types.bundle.d.ts` y
compara los exports de ese bundle con `scripts/__fixtures__/types-bundle-exports.snapshot.txt`. Si cambiaste los
exports públicos a propósito, actualiza el snapshot. Para una recompilación limpia:

```bash
pnpm clean            # borra dist/ y node_modules/
pnpm install
pnpm build
```

Después de cambiar cualquier cosa en `src/api/v2/`, ejecuta `pnpm codegen:mcp` para regenerar el catálogo de
métodos que lee el servidor MCP (`src/mcp/generated/catalog.json`). `src/api/v2/generated/constants.ts` se
genera con `pnpm codegen:v2` a partir del documento OpenAPI de api_v2: nunca edites ninguno de los dos a mano.

Para probar la compilación en local, ejecuta `node dist/cli/index.js --help`, o enlázala con `npm link` y ejecuta
`plane --help`. `npm pack --dry-run` lista exactamente lo que se publicaría.

## Tests

Los tests viven en `tests/unit/` y `tests/e2e/`. Los tests unitarios no necesitan una instancia de Plane. Los
tests de extremo a extremo necesitan un `.env.test` con ids reales:

```bash
cp env.example .env.test
```

Luego completa `TEST_WORKSPACE_SLUG`, `TEST_PROJECT_ID`, `TEST_USER_ID`, `TEST_WORK_ITEM_ID`, `TEST_CUSTOMER_ID`
y los demás ids que pidan las suites.

```bash
pnpm test                                 # todo
pnpm test:unit                            # solo tests unitarios
pnpm test:e2e                             # solo tests de extremo a extremo
pnpm test tests/unit/page.test.ts         # un archivo
```

Los tests se ejecutan de uno en uno, para no superar el límite de peticiones de Plane.

## Cómo se mantiene honesta la superficie v2

La superficie v2 son 90 clases de recursos, y nada de ella se revisa por muestreo. Los rule sweeps se ejecutan
sobre **todas** las clases, enumeradas a partir del código fuente de TypeScript, y cada uno se demuestra
introduciendo la infracción y viendo cómo el sweep la señala:

| Sweep                          | Qué rechaza                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------- |
| Forma de la llamada            | un método que no empieza con los ids de ruta de su URL, en el orden de la ruta                    |
| `fields` / `expand`            | una operación que ofrece una proyección que el SDK no expone                                      |
| Filtros de consulta            | un `?filter=` que la API acepta y que ningún tipo de params declara                               |
| `order_by`                     | un orden de clasificación que falta, o un tipo de params apuntando al enum de otra operación      |
| Paginación                     | una mitad inalcanzable del sobre de paginación, incluido un `paginate` sin `cursor` para gastarlo |
| Correspondencia de operaciones | un método sin entrada en `operations`, exento en silencio de todo lo anterior                     |
| Solidez de la proyección       | un método que acepta `fields` y de todos modos devuelve la fila completa                          |
| Enrutamiento del loader        | un método que devuelve filas en una clase navegable y se salta `load()`                           |
| Rutas alternativas             | un método que declara un override de `extraPaths` y lo ignora                                     |
| Lookups                        | un `findBy*` que filtra por algo que la API no permite filtrar                                    |

Otros dos sweeps cubren el árbol en vez de las clases: la **completitud de banda** exige que todo recurso esté
conectado a la raíz que nombra la plantilla de su URL (y que nada ajeno lo esté), y la **completitud de
navegación** exige que un recurso que conecta un hijo devuelva filas navegables, con una propiedad por hijo y
ninguna propiedad que tape un campo real. Cada método también verifica su URL de petición exacta contra un
servidor simulado.

La documentación también se comprueba. `tests/unit/v2/readme-samples.test.ts` verifica en tiempo de compilación
cada fence de TypeScript en `README.md`, `CLAUDE.md`, `AGENTS.MD` y cada página de este sitio, en todos los
idiomas, contra el código fuente del SDK. También comprueba las afirmaciones en prosa que son hechos sobre el
repositorio: scripts que existen, rutas que existen, nombres de `v2.` que se exportan y límites de lote que
coinciden con el kernel.

## Este sitio

El sitio vive en `website/`, un paquete del workspace construido con Docusaurus. Las guías son Markdown en
`website/docs/`, cada traducción las refleja en `website/i18n/<locale>/`, y la referencia de la API se genera
desde `src/` con TypeDoc en cada compilación.

```bash
pnpm docs:dev                        # vista previa en vivo, en inglés
pnpm docs:dev --locale pt-BR         # vista previa en vivo en otro idioma (pt-PT, es-ES, zh-Hans, …)
pnpm docs:build                      # todos los idiomas, en website/build/
GIT_USER=<github-user> pnpm docs:deploy   # compila y publica en la rama gh-pages
```

La búsqueda (Ctrl/Cmd+K) usa un índice offline, uno por idioma, que genera `pnpm docs:build`; no funciona con
`pnpm docs:dev`, así que pruébala con `pnpm docs:serve` después de un build. La referencia de la API queda fuera del
índice. El build en inglés también genera `llms.txt` y `llms-full.txt` en la raíz del sitio, a partir de las guías
en inglés, para que las lean las herramientas de IA. Ambos son salida del build: nunca los subas al repositorio ni
los escribas a mano.
