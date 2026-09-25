import Link from "@docusaurus/Link";
import Translate, { translate } from "@docusaurus/Translate";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import CodeBlock from "@theme/CodeBlock";
import Layout from "@theme/Layout";
import { useState, type ReactNode } from "react";

const INSTALL = "npm install @hoyasumii/plane";

interface Feature {
  label: string;
  title: string;
  to: string;
  description: ReactNode;
  sample: string;
  language: string;
}

/** Built per render, so `translate` runs with the page's locale loaded. */
function features(): Feature[] {
  return [
    {
      label: "@hoyasumii/plane",
      title: "SDK",
      to: "/docs/sdk/v2/overview",
      description: (
        <Translate id="home.sdk.description">
          A typed client for API v1 and the whole v2 surface: 90 resources, field lists that narrow the return type at
          compile time, and fetched rows you can navigate to their children.
        </Translate>
      ),
      language: "ts",
      sample: `const eng = await client.v2.workspaces.projects.retrieve("acme", "ENG");
await eng.workItems.create({ name: "Fix login bug", state: "Todo" });`,
    },
    {
      label: "plane-mcp",
      title: translate({ id: "home.mcp.title", message: "MCP server" }),
      to: "/docs/mcp/overview",
      description: (
        <Translate id="home.mcp.description">
          Plane for Claude Code, Codex, OpenCode or any MCP client: task tools that work by key and by name, plus three
          generic tools that reach every v2 method.
        </Translate>
      ),
      language: "bash",
      sample: `npx plane mcp config
npx plane mcp install`,
    },
    {
      label: "plane",
      title: "CLI",
      to: "/docs/cli/overview",
      description: (
        <Translate id="home.cli.description">
          Every MCP tool as a terminal command, plus plane mcp to run the server in the background, start it at login
          and register it in your clients.
        </Translate>
      ),
      language: "bash",
      sample: `npx plane get-issue --key ACME-14
npx plane list-my-issues --project ACME`,
    },
  ];
}

function InstallCommand(): ReactNode {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(INSTALL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="home-install">
      <code style={{ all: "unset" }}>
        <span>$ </span>
        {INSTALL}
      </code>
      <button type="button" onClick={copy}>
        {copied ? (
          <Translate id="home.install.copied">Copied</Translate>
        ) : (
          <Translate id="home.install.copy">Copy</Translate>
        )}
      </button>
    </div>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={translate({ id: "home.title", message: "Plane SDK, MCP server and CLI" })}
      description={siteConfig.tagline}
    >
      <header className="home-hero">
        <div className="container">
          <span className="home-badge">
            <Translate id="home.badge">TypeScript · API v1 + v2 · MCP · CLI</Translate>
          </span>
          <h1 className="home-title">
            <Translate id="home.headline">The Plane API, typed end to end</Translate>
          </h1>
          <p className="home-subtitle">
            <Translate id="home.tagline">
              A TypeScript SDK for the Plane API, with an MCP server and a CLI built on top of it. Use it from code,
              from an AI agent or from your terminal: all three share the same client.
            </Translate>
          </p>
          <div className="home-actions">
            <Link className="home-button home-button--primary" to="/docs/intro">
              <Translate id="home.getStarted">Get started</Translate> →
            </Link>
            <Link className="home-button home-button--ghost" to="https://github.com/Hoyasumii/plane">
              GitHub
            </Link>
          </div>
          <InstallCommand />
        </div>
      </header>
      <main className="container">
        <div className="home-features">
          {features().map((feature) => (
            <div key={feature.title} className="home-card">
              <span className="home-card__label">{feature.label}</span>
              <h3>
                <Link to={feature.to}>{feature.title}</Link>
              </h3>
              <p>{feature.description}</p>
              <CodeBlock language={feature.language}>{feature.sample}</CodeBlock>
            </div>
          ))}
        </div>
      </main>
    </Layout>
  );
}
