---
sidebar_position: 2
title: Filas cargadas
description: "Filas navegables en la API v2: una fila obtenida lleva sus ids, así que a sus hijos se llega sin volver a pasarlos."
---

# Filas cargadas

Un recurso que tiene hijos devuelve **filas navegables** desde cada método que devuelve filas: los datos
propios de la fila, más una propiedad por hijo, con los ids que la produjeron ya provistos. Esta es la regla de
consumo de ids: _un id se pasa una vez, en el punto donde se conoce_. Un recurso sin hijos (`states`, `labels`,
`roles`) devuelve el modelo simple, ya que no hay nada a lo que llegar desde él.

```ts
const workspace = await client.v2.workspaces.retrieve("acme");

await workspace.projects.list(); // sin slug
await workspace.teamspaces.list(); // sin slug

// Y se puede encadenar: un proyecto obtenido lleva ambos ids.
const eng = await workspace.projects.retrieve("ENG");
await eng.states.list(); // sin slug, sin clave de proyecto
await eng.workItems.create({ name: "Fix login bug", state: "Todo", labels: ["bug"] });

// Tres niveles de profundidad: un work item obtenido lleva los tres.
const item = await eng.workItems.retrieve("wi-1");
await item.comments.list();
```

Encadenar funciona porque una fila _sabe qué ids la obtuvieron_. `list` e `iterate` también devuelven filas
navegables, así que la paginación no pierde la navegación:

```ts
for await (const project of client.v2.workspaces.projects.iterate("acme")) {
  await project.states.list(); // sigue siendo navegable
}
```

## Qué lleva una fila cargada

Una fila navegable tiene el tipo `Loaded<Row, Navigation>`. Cada propiedad de navegación es una vista
`Owned<Child, Ids>`: los propios métodos del recurso hijo, con los ids que la fila ya tiene eliminados del
principio. Así, `eng.states.list()` es `client.v2.workspaces.projects.states.list("acme", "ENG")` con ambos
argumentos iniciales ya provistos.

- **`row.$loaded`** lleva `ids`, `idNames` y `present`, el conjunto de nombres de campo que el servidor
  realmente devolvió. Tanto esto como las propiedades de navegación son no enumerables, así que `{ ...row }`,
  `Object.keys(row)` y `JSON.stringify(row)` ven la fila simple de la API.
- **Una propiedad de navegación nunca tapa un campo.** Donde el nombre natural de un hijo ya es un campo de la
  fila, la propiedad se renombra y el campo se conserva: `estimate.estimatePoints` (porque `?expand=points`
  devuelve un campo real `points`) y `property.propertyOptions` (igualmente `options`). Construir una fila que
  tapase un campo lanza un error en vez de ocultar datos.
- **Solo los métodos sobreviven a la navegación.** No se puede llegar a un recurso nieto desde una vista:
  `project.workItems.comments` no existe, porque un comentario necesita el propio id de un work item, que solo
  lleva un work item ya obtenido. Obtén primero el work item.

```ts
const project = await client.v2.workspaces.projects.retrieve("acme", "ENG");
console.log(project.$loaded.ids, project.$loaded.present.has("name"));
console.log(JSON.stringify(project)); // la fila simple de la API, sin navegación
```

## Dónde se detiene la navegación

`wiki` y `groupSync` son nodos de agrupación, no recursos: no consumen ningún id de ruta propio, así que no son
propiedades de navegación en una fila de workspace obtenida. Llega a ellos en plano, como
`client.v2.workspaces.wiki` y `client.v2.workspaces.groupSync`.

`releases.labels` es el único lugar donde una fila obtenida y la ruta plana difieren. La clase contiene tanto
el catálogo de labels a nivel de workspace (`list`/`create`, solo con slug) como el puente de membresía por
release. Un release obtenido vincula el puente, así que `release.labels.add(...)` funciona y
`release.labels.list()` no compila. Llega al catálogo en plano.

## Las llamadas navegadas no restringen `fields`

Una llamada navegada acepta `fields` pero devuelve el tipo de fila completo. Esa es la única limitación de esta
forma, y la razón por la que la ruta plana sigue siendo pública. Consulta
[Proyección de campos](./field-projection.md#navigated-calls-do-not-narrow).

## No existe una tercera forma

`client.v2.workspace(slug).project(key)`, la cadena de localizadores enlazados que mostraban las vistas previas
anteriores, está **eliminada**, no obsoleta. No enlazaba nada: cada recurso recibe sus ids en cada llamada, así
que `workspace(slug).roles.list(slug)` pasaba el slug dos veces. Toda familia que contenía ya está en
`v2.workspaces`.
