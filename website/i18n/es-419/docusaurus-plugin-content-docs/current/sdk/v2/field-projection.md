---
sidebar_position: 3
title: Proyección de campos
description: "Cómo fields restringe el tipo de retorno en tiempo de compilación, en lecturas y escrituras, y el único lugar donde la restricción no sobrevive."
---

# Proyección de campos

`fields` restringe el **tipo de retorno**, no solo la respuesta. Pide dos campos y la fila que recibes tiene
esos dos más `id`. Leer cualquier otro es un error de compilación, no un `undefined` en tiempo de ejecución:

```ts
const page = await client.v2.workspaces.projects.states.list("acme", "ENG", { fields: ["id", "name"] });
for (const state of page.data) {
  console.log(state.id, state.name); // tipado: solo existen id/name en esta fila
  // console.log(state.color);       // error de compilación: `color` no se pidió
}
```

Un array literal en línea no necesita `as const`. Lo mismo aplica a `iterate` y `retrieve`, y, al ser la misma
afirmación, para **escrituras**: `create`, `update` y `upsert` aceptan `fields` y restringen su respuesta del
mismo modo.

```ts
const created = await client.v2.workspaces.projects.states.create(
  "acme",
  "ENG",
  { name: "In Review", color: "#4ECDC4" },
  { fields: ["id", "name"] }
);
console.log(created.name); // restringido; `created.color` no compilaría
```

## Listas de campos construidas en tiempo de ejecución

Una lista de campos construida en tiempo de ejecución (no un literal) debe seguir tipándose como nombres de
campo. Un `string[]` simple **no** es asignable a `readonly StateField[]` y falla con un largo error de
desajuste de overload. La fila se restringe al **tipo de elemento** de la lista, así que tipa la variable tan
estrechamente como realmente la usas:

```ts
import { PlaneClient, v2 } from "@hoyasumii/plane";

const client = new PlaneClient({ baseUrl: "https://api.plane.so", apiKey: "..." });

// Restringido a estos dos nombres, aunque el valor se elige en tiempo de ejecución.
const wanted: ("id" | "name")[] = includeColor ? ["id", "name"] : ["id"];
const page = await client.v2.workspaces.projects.states.list("acme", "ENG", { fields: wanted });

// Tipado como la unión entera, esto restringe a "todos los campos", es decir, la fila completa.
const anything: v2.StateField[] = includeColor ? ["id", "name", "color"] : ["id", "name"];
const unnarrowed = await client.v2.workspaces.projects.states.list("acme", "ENG", { fields: anything });
```

`"all"` es un valor de campo válido que significa "todos los campos", y produce correctamente el tipo de fila
completo.

Las respuestas parciales hacen que todo campo de lectura salvo `id` sea opcional en los modelos. Comprueba si
hay `undefined` en vez de asumir que el valor está presente. Cuando la lista se construyó dinámicamente,
`row.$loaded.present` te dice qué llegó realmente.

## Las llamadas navegadas no restringen {#navigated-calls-do-not-narrow}

**Esta limitación es la razón por la que la forma plana sigue siendo pública.** Una llamada navegada se
resuelve contra la firma general, así que acepta `fields` pero **no** restringe:

```ts
const eng = await client.v2.workspaces.projects.retrieve("acme", "ENG");
const listed = await eng.states.list({ fields: ["id", "name"] }); // Page<State>, sin restringir
```

TypeScript borra un parámetro de tipo cuando infiere a través del tipo condicional detrás de una propiedad de
navegación, así que el overload que restringe no se puede transportar. Igualar el conjunto de overloads sería
peor, no mejor: la inferencia borraría `F` hasta su restricción y afirmaría que _todos_ los campos están
presentes. Cuando quieras la fila restringida, llama al recurso en plano:
`client.v2.workspaces.projects.states.list("acme", "ENG", { fields: [...] })`.

## `expand` y `order_by`

`expand` incrusta objetos relacionados (`{ expand: ["state", "labels"] }` en un work item), validado contra los
valores permitidos de la operación en `v2.EXPAND`.

`order_by` se valida del mismo modo que `fields`, contra una unión generada (`StateOrderBy`, `LabelOrderBy`,
…). Un literal fuera de esa unión es un error de compilación, y un valor construido en tiempo de ejecución es
rechazado en el cliente por `encodeOrderBy` en vez de llegar al servidor como un 400.

```ts
await client.v2.workspaces.projects.states.list("acme", "ENG", { order_by: "-created_at" });
```
