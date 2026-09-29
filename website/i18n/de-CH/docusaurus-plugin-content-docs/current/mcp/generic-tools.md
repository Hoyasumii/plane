---
sidebar_position: 5
title: Generische Tools
description: "plane_resources, plane_describe und plane_call: drei MCP-Tools, die jede API-v2-Methode in allen 90 Ressourcen erreichen."
---

# Generische Tools

Drei Tools erreichen jede v2-Methode, die das SDK hat, über alle 90 Ressourcen hinweg: Cycles, Module, Pages,
Releases, Initiatives, Customers, Webhooks und den Rest. Sie liegen in `src/mcp/tools/generic.ts`.

1. **`plane_resources`** findet eine Ressource. Ohne ein `query` listet es jeden Ressourcenpfad mit seinen
   Methodennamen. Mit einem (`"cycle work items"`, `"webhook"`) zeigt es die passenden Ressourcen mit ihren
   Methodensignaturen.
2. **`plane_describe`** nimmt eine `resource` und eine `method` entgegen und zeigt die vollständige Signatur:
   die Parameter in Aufrufreihenfolge (mit den Schreib-Body-Feldern), welche davon Path-IDs sind, die erlaubten
   `fields`/`expand`/`order_by`/Filterwerte und eine Beispiel-`plane_call`-Eingabe.
3. **`plane_call`** führt die Methode aus, mit ihren Argumenten nach Parametername.

Ein typischer Austausch, so wie der Agent ihn sieht:

```json
{ "tool": "plane_resources", "arguments": { "query": "cycle" } }
{ "tool": "plane_describe", "arguments": { "resource": "workspaces.projects.cycles", "method": "list" } }
{
  "tool": "plane_call",
  "arguments": {
    "resource": "workspaces.projects.cycles",
    "method": "list",
    "args": { "slug": "acme", "project": "ENG", "params": { "per_page": 20 } }
  }
}
```

## `plane_call`

| Eingabe    | Bedeutung                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------ |
| `resource` | der gepunktete Ressourcenpfad, z. B. `workspaces.projects.states`                                      |
| `method`   | der Methodenname, z. B. `list`, `create`, `add`                                                        |
| `args`     | Argumente nach Parametername: zuerst Path-IDs (`slug`, `project`, …), dann die `data`/`params`-Objekte |
| `limit`    | für `iterate`-Methoden: wie viele Elemente gesammelt werden (Standard 100, höchstens 1000)             |
| `confirm`  | muss `true` sein, um eine destruktive Methode auszuführen                                              |

`slug` verwendet standardmässig den konfigurierten Arbeitsbereich. Die `params` von Listen akzeptieren `fields`,
Filter, `order_by`, `per_page` und `offset`. Ein Ergebnis über 60.000 Zeichen wird abgeschnitten, mit einem
entsprechenden Hinweis.

**Destruktive Methoden** (`delete`, `bulkDelete`, `remove`, `unlink`) verweigern die Ausführung ohne
`confirm: true`. Die Tool-Beschreibung weist den Agenten an, zuerst den Nutzer zu fragen.

## Der Katalog

Die generischen Tools lesen `src/mcp/generated/catalog.json`: Ressourcenpfade, Parameternamen in
Aufrufreihenfolge und die erlaubten Werte aus dem api_v2-OpenAPI-Dokument. Er wird von `pnpm codegen:mcp` aus
dem SDK-Quellcode erzeugt und nie von Hand bearbeitet.

`plane_call` erreicht nur Methoden im Katalog und ordnet die benannten Argumente nach den dort deklarierten
Parameternamen. Auf einer Instanz ohne API v2 verweigern `plane_resources` und `plane_call` mit einer Meldung,
die auf die typisierten Tools verweist; `plane_describe` funktioniert weiter, da es nur den Katalog liest.
