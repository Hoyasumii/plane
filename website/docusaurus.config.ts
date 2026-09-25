import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import { themes as prismThemes } from "prism-react-renderer";

const repository = "https://github.com/Hoyasumii/plane";

const config: Config = {
  title: "@hoyasumii/plane",
  tagline: "A TypeScript SDK for the Plane API, with an MCP server and a CLI built on top of it.",
  favicon: "img/favicon.svg",

  // GitHub Pages, published from the `gh-pages` branch by `pnpm docs:deploy`.
  url: "https://hoyasumii.github.io",
  baseUrl: "/plane/",
  organizationName: "Hoyasumii",
  projectName: "plane",
  deploymentBranch: "gh-pages",
  trailingSlash: false,

  onBrokenLinks: "throw",

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
    locales: ["en", "pt-BR"],
    localeConfigs: {
      en: { label: "English", htmlLang: "en" },
      "pt-BR": { label: "Português (Brasil)", htmlLang: "pt-BR" },
    },
  },

  plugins: [
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
    ],
  ],

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
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
    colorMode: { defaultMode: "dark", respectPrefersColorScheme: true },
    docs: { sidebar: { hideable: true } },
    navbar: {
      title: "@hoyasumii/plane",
      logo: { alt: "Plane SDK", src: "img/logo.svg" },
      items: [
        { type: "docSidebar", sidebarId: "guides", position: "left", label: "Docs" },
        { type: "doc", docId: "sdk/v2/overview", position: "left", label: "SDK" },
        { type: "doc", docId: "mcp/overview", position: "left", label: "MCP" },
        { type: "doc", docId: "cli/overview", position: "left", label: "CLI" },
        { type: "docSidebar", sidebarId: "api", position: "left", label: "API Reference" },
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
