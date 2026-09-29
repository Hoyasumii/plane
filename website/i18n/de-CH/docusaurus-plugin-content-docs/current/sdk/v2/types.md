---
sidebar_position: 9
title: Typen
description: "Wo die API-v2-Typen liegen: die Namespaces v2 und v2models und die Aliase mit V2-Präfix im Paket-Root."
---

# Typen

v2-Typen sind über die Namespaces `v2` und `v2models` erreichbar (zum Beispiel `v2models.State` und
`v2.StateField`). Die häufigsten sind auch am Paketstamm aliasiert: `V2Label`, `V2State`, `V2Project`,
`V2Workspace`, `V2WorkItem`, `V2Cycle`, `V2Module`, `V2Milestone`, `V2ListStatesParams` und
`V2ListLabelsParams`, sowie die `V2Create*`/`V2Update*`-Anfragemodelle.

Verwende diese Namen. Die nackten Namen `Label`/`State`/`Project`/`Workspace`/`Page` von v2 kollidieren mit
denen von v1 in den gebündelten Typdefinitionen, sodass `import { Workspace } from "@hoyasumii/plane"` zur
Form von **v1** aufgelöst wird, nicht zu der von v2. `V2Page` ist das Wiki-Seitenmodell, und die Pagination-
Hülle `Page<T>` ist separat als `V2PageEnvelope` aliasiert.

```ts
import type { V2PageEnvelope, V2State, v2, v2models } from "@hoyasumii/plane";

const fields: v2.StateField[] = ["id", "name"];
const page: V2PageEnvelope<V2State> = await client.v2.workspaces.projects.states.list("acme", "ENG");
const first: v2models.State | undefined = page.data[0];
```

Die Typen, zu denen eine navigierbare Zeile aufgelöst wird, werden ebenfalls unter `v2` exportiert:
`v2.LoadedProject`, `v2.ProjectNavigation`, `v2.ProjectIds`, `v2.PROJECT_ID_NAMES`, und derselbe Satz für jede
Familie, plus die Kernel-Typen `v2.Loaded`, `v2.Owned` und `v2.LoadedMeta`.

Lesemodelle markieren jedes Feld ausser `id` als optional, weil `?fields=` und Collection-Deferral jedes davon
auslassen können.

Für die vollständige Liste der exportierten Klassen, Modelle und Hilfsmittel siehe die
[API-Referenz](pathname:///plane/docs/api).
