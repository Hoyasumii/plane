---
sidebar_position: 8
title: Errores
description: "Todos los errores que lanza el SDK extienden PlaneError: detalles de problema de la API, búsquedas sin resultado, fallos de red y URL que no se pueden construir."
---

# Errores

Todo error que lanza el SDK extiende `PlaneError`, y todas las clases de abajo se exportan desde la raíz del
paquete.

| Error                       | Lo lanza | Cuándo                                                                                |
| --------------------------- | -------- | ------------------------------------------------------------------------------------- |
| `PlaneApiError`             | v2       | la API respondió con un error: un problem detail de RFC 9457                          |
| `NoMatchFoundError`         | v2       | una búsqueda `findBy*` no encontró nada                                               |
| `MultipleMatchesFoundError` | v2       | una búsqueda `findBy*` encontró más de una fila                                       |
| `PlaneNetworkError`         | v2       | la petición nunca llegó a un servidor: conexión rechazada, fallo de DNS, timeout…     |
| `MissingPathIdError`        | v2       | no se puede construir una URL porque falta un id de ruta                              |
| `HttpError`                 | v1       | falló una petición v1: el código de estado, el cuerpo de la respuesta y sus cabeceras |
| `AttachmentTooLargeError`   | v1       | `workItems.attachments.download` superó su `maxBytes`                                 |

Los siete extienden `PlaneError` directamente. En particular, los errores de búsqueda **no** son subclases de
`PlaneApiError`, así que capturar solo esa clase no los captura.

## `PlaneApiError`

`PlaneApiError` lleva el problem detail como `.status`, `.type`, `.code`, `.detail` y `.errors`, este último
siendo los errores de validación por campo cuando el servidor los envió.

```ts
import { PlaneApiError, PlaneNetworkError } from "@hoyasumii/plane";

try {
  await client.v2.workspaces.projects.states.create("acme", "ENG", { name: "", color: "#000000" });
} catch (error) {
  if (error instanceof PlaneApiError) {
    console.log(error.status, error.code, error.detail, error.errors);
  } else if (error instanceof PlaneNetworkError) {
    console.log("unreachable:", error.message, error.cause);
  } else {
    throw error;
  }
}
```

Una escritura en lote responde HTTP 200 incluso cuando fallan filas. `v2.raiseForFailures(result)` convierte un
fallo en un `PlaneApiError` (consulta
[Membresías y escrituras en lote](./memberships-and-bulk.md#bulk-writes)).
