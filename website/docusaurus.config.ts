import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import { themes as prismThemes } from "prism-react-renderer";

const repository = "https://github.com/Hoyasumii/plane";
const baseUrl = "/plane/";

// Docusaurus sets DOCUSAURUS_CURRENT_LOCALE before it loads this file for each locale.
const isDefaultLocale = (process.env.DOCUSAURUS_CURRENT_LOCALE ?? "en") === "en";

/** The language menu's labels, one per locale; `htmlLang` is the locale itself. */
const labels: Record<string, string> = {
  en: "English",
  "pt-BR": "Português (Brasil)",
  "pt-PT": "Português (Portugal)",
  "es-ES": "Español (España)",
  "es-419": "Español (Latinoamérica)",
  "fr-FR": "Français (France)",
  "fr-CA": "Français (Canada)",
  "de-DE": "Deutsch (Deutschland)",
  "de-CH": "Deutsch (Schweiz)",
  "zh-Hans": "简体中文",
  "zh-Hant": "繁體中文",
};

const config: Config = {
  title: "@hoyasumii/plane",
  tagline: "A TypeScript SDK for the Plane API, with an MCP server and a CLI built on top of it.",
  favicon: "img/favicon.png",

  // GitHub Pages, published from the `gh-pages` branch by `pnpm docs:deploy`.
  url: "https://hoyasumii.github.io",
  baseUrl,
  organizationName: "Hoyasumii",
  projectName: "plane",
  deploymentBranch: "gh-pages",
  trailingSlash: false,

  onBrokenLinks: "throw",

  // Rspack, SWC and Lightning CSS (@docusaurus/faster) instead of webpack and Babel, with a
  // persistent cache. The English build compiles the whole TypeDoc reference, which is most of its
  // build time. Static pages are not rendered on worker threads: every worker loads its own copy
  // of the server bundle with the ~1,150 reference pages, which multiplies the memory a build
  // needs. scripts/build.mjs builds one locale per process for the same reason.
  future: {
    faster: {
      swcJsLoader: true,
      swcJsMinimizer: true,
      swcHtmlMinimizer: true,
      lightningCssMinimizer: true,
      mdxCrossCompilerCache: true,
      rspackBundler: true,
      rspackPersistentCache: true,
      gitEagerVcs: true,
      ssgWorkerThreads: false,
    },
  },

  headTags: [
    { tagName: "link", attributes: { rel: "preconnect", href: "https://fonts.googleapis.com" } },
    { tagName: "link", attributes: { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "anonymous" } },
  ],
  stylesheets: [
    "https://fonts.googleapis.com/css2?family=Geist:wght@400..700&family=Geist+Mono:wght@400..600&display=swap",
  ],
  markdown: {
    // Plain Markdown, not MDX: the pages stay readable by the fence checks in
    // tests/unit/v2/readme-samples.test.ts, and a `{` in prose is just a brace.
    format: "md",
    hooks: { onBrokenMarkdownLinks: "throw" },
  },

  i18n: {
    defaultLocale: "en",
    locales: ["en", "pt-BR", "pt-PT", "es-ES", "es-419", "fr-FR", "fr-CA", "de-DE", "de-CH", "zh-Hans", "zh-Hant"],
    // Every baseUrl is explicit. scripts/build.mjs builds one locale per `docusaurus build --locale`,
    // and a build given a single locale drops the /<locale>/ segment from every inferred baseUrl
    // (meant for one domain per locale), which would serve pt-BR at /plane/ and point the language
    // menu at the wrong pages.
    localeConfigs: Object.fromEntries(
      Object.entries(labels).map(([locale, label]) => [
        locale,
        { label, htmlLang: locale, baseUrl: locale === "en" ? baseUrl : `${baseUrl}${locale}/` },
      ])
    ),
  },

  // Remembers the language picked in the navbar menu; src/pages/index.tsx reads it on the English
  // home page before falling back to the browser's languages.
  clientModules: ["./src/remember-locale.ts"],

  plugins: [
    // The TypeDoc reference is English whatever the locale, so only the English build generates and
    // compiles it: every translated locale would otherwise compile its own copy of the same ~1,150
    // pages. The translated sites exclude docs/api/ (see presets below) and link to the English one.
    ...(isDefaultLocale
      ? [
          [
            "docusaurus-plugin-typedoc",
            {
              entryPoints: ["../src/index.ts", "../src/mcp/index.ts"],
              tsconfig: "../tsconfig.json",
              out: "docs/api",
              readme: "none",
              excludePrivate: true,
              excludeInternal: true,
              skipErrorChecking: true,
              sidebar: { autoConfiguration: true, pretty: true },
            },
          ] as [string, object],
        ]
      : []),
    // Writes llms.txt and llms-full.txt from the English guides on every build. It always reads
    // website/docs/, so it runs for the default locale only: every other locale would get an English
    // copy. The TypeDoc reference stays out: it repeats the published .d.ts files.
    ...(isDefaultLocale
      ? [
          [
            "docusaurus-plugin-llms",
            {
              ignoreFiles: ["api/**"],
              includeOrder: ["intro.md", "sdk/**", "mcp/**", "cli/**", "contributing.md"],
            },
          ] as [string, object],
        ]
      : []),
  ],

  themes: [
    [
      // Offline search, indexed at build time (no search in `docusaurus start`). Ctrl/Cmd+K opens it.
      // One index per locale; the TypeDoc reference stays out, it would drown the guides.
      "@easyops-cn/docusaurus-search-local",
      {
        hashed: true,
        indexBlog: false,
        language: ["en", "pt", "es", "fr", "de", "zh"],
        ignoreFiles: [/(^|\/)docs\/api(\/|$)/],
        highlightSearchTermsOnTargetPage: true,
      },
    ],
  ],

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          // The translated sites leave out the TypeDoc reference (see plugins above).
          exclude: isDefaultLocale ? undefined : ["api/**"],
          editUrl: ({ locale, docPath }) =>
            locale === "en"
              ? `${repository}/edit/main/website/docs/${docPath}`
              : `${repository}/edit/main/website/i18n/${locale}/docusaurus-plugin-content-docs/current/${docPath}`,
        },
        blog: false,
        theme: { customCss: "./src/css/custom.css" },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: "img/social-card.png",
    colorMode: { defaultMode: "dark", respectPrefersColorScheme: true },
    docs: { sidebar: { hideable: true } },
    navbar: {
      title: "@hoyasumii/plane",
      logo: { alt: "hoyasumii", src: "img/logo.png" },
      items: [
        { type: "docSidebar", sidebarId: "guides", position: "left", label: "Docs" },
        { type: "doc", docId: "sdk/v2/overview", position: "left", label: "SDK" },
        { type: "doc", docId: "mcp/overview", position: "left", label: "MCP" },
        { type: "doc", docId: "cli/overview", position: "left", label: "CLI" },
        // Only the English site has the reference. `pathname://` keeps the translated sites' baseUrl
        // off the link and makes it a full page load, since the page is not in their bundle.
        isDefaultLocale
          ? { type: "docSidebar", sidebarId: "api", position: "left", label: "API Reference" }
          : { to: `pathname://${baseUrl}docs/api`, position: "left", label: "API Reference" },
        { type: "localeDropdown", position: "right" },
        { href: repository, label: "GitHub", position: "right" },
      ],
    },
    footer: {
      style: "light",
      links: [
        {
          title: "Docs",
          items: [
            { label: "Getting started", to: "/docs/intro" },
            { label: "SDK", to: "/docs/sdk/v2/overview" },
            { label: "MCP server", to: "/docs/mcp/overview" },
            { label: "CLI", to: "/docs/cli/overview" },
          ],
        },
        {
          title: "Package",
          items: [
            { label: "npm", href: "https://www.npmjs.com/package/@hoyasumii/plane" },
            { label: "GitHub", href: repository },
            { label: "Issues", href: `${repository}/issues` },
          ],
        },
      ],
      copyright: "MIT licensed. Not affiliated with or endorsed by Plane Software, Inc. “Plane” is their trademark.",
    },
    prism: {
      theme: prismThemes.oneLight,
      darkTheme: prismThemes.oneDark,
      additionalLanguages: ["bash", "json", "powershell"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
