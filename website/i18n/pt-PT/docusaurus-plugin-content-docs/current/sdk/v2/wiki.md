---
sidebar_position: 7
title: Wiki
description: "A wiki do workspace na API v2: páginas globais, coleções e os respetivos membros, em v2.workspaces.wiki."
---

# Wiki

`v2.workspaces.wiki` agrupa a wiki do workspace:

- `v2.workspaces.wiki.pages` são todas as páginas globais do workspace. As páginas de um projeto ficam em
  `v2.workspaces.projects.pages`.
- `v2.workspaces.wiki.collections` são as coleções da wiki, com a respetiva ponte `members`.

O `collection_id` de uma escrita de página pode ser omitido numa página pública, que fica na coleção predefinida
"General" do workspace. Uma página privada precisa de um `collection_id` explícito, de uma coleção de que quem a
chama é proprietário.

```ts
const wiki = client.v2.workspaces.wiki;

await wiki.pages.create("acme", { name: "Handbook" }); // página pública -> coleção predefinida
const handbook = await wiki.collections.findByName("acme", "Engineering handbook");
await wiki.pages.create("acme", { name: "Runbook", collection_id: handbook.id });
await wiki.collections.default("acme"); // a coleção predefinida, resolvida através de `is_default`
```

`wiki` e `groupSync` são nós de agrupamento, não recursos: não consomem nenhum id de caminho próprio, pelo que
não são propriedades de navegação numa linha de workspace obtida. Aceda a eles pelo caminho plano.

O modelo de página da wiki é exportado como `V2Page` na raiz do pacote, e como `v2models.Page`.
