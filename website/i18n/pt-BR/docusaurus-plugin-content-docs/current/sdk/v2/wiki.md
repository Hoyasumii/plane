---
sidebar_position: 7
title: Wiki
---

# Wiki

`v2.workspaces.wiki` agrupa a wiki do workspace:

- `v2.workspaces.wiki.pages` são todas as páginas globais do workspace. As páginas de um projeto ficam em
  `v2.workspaces.projects.pages`.
- `v2.workspaces.wiki.collections` são as coleções da wiki, com a ponte `members` delas.

O `collection_id` de uma escrita de página pode ser omitido numa página pública, que cai na coleção padrão
"General" do workspace. Uma página privada precisa de um `collection_id` explícito, de uma coleção da qual quem
chama é dono.

```ts
const wiki = client.v2.workspaces.wiki;

await wiki.pages.create("acme", { name: "Handbook" }); // página pública -> coleção padrão
const handbook = await wiki.collections.findByName("acme", "Engineering handbook");
await wiki.pages.create("acme", { name: "Runbook", collection_id: handbook.id });
await wiki.collections.default("acme"); // a coleção padrão, resolvida por `is_default`
```

`wiki` e `groupSync` são nós de agrupamento, não recursos: não consomem nenhum id de caminho próprio, então não
são propriedades de navegação numa linha de workspace buscada. Acesse-os pelo caminho plano.

O modelo de página da wiki é exportado como `V2Page` na raiz do pacote, e como `v2models.Page`.
