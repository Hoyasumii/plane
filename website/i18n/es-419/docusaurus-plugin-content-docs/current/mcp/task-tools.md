---
sidebar_position: 3
title: Herramientas de tarea
description: "Las herramientas de tarea del MCP: tareas por clave, y proyectos, estados, labels y miembros por nombre, con una salida legible."
---

# Herramientas de tarea

Estas herramientas son el contrato estable en el que se apoyan los flujos de agentes basados en tareas. Toman
tareas por clave (`ACME-130`) y proyectos, estados, labels y miembros por nombre, y responden con salida
legible, sin ids. Viven en `src/mcp/tools/kit.ts`.

Cada herramienta acepta un `slug` (el workspace) opcional. Con un workspace por defecto configurado
(`PLANE_WORKSPACE`), se puede omitir en todas partes.

| Herramienta              | Qué hace                                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `plane_whoami`           | el usuario de la clave, el workspace, la URL base y la API que sirve la instancia (`v1`/`v2`)                    |
| `plane_list_projects`    | los proyectos del workspace, con el identificador que se usa en las claves                                       |
| `plane_list_my_issues`   | las tareas asignadas a mí (las abiertas por defecto), en un proyecto o en todos                                  |
| `plane_search_issues`    | las tareas de un proyecto por texto, responsable y grupo de estado                                               |
| `plane_get_issue`        | una tarea: estado y grupo, prioridad, responsables y labels por nombre, fechas, `url`, la descripción como texto |
| `plane_get_issue_images` | descarga las imágenes de la descripción a `image-<n>.<ext>` (por defecto `<tmp>/plane-mcp/<KEY>/`)               |
| `plane_list_comments`    | los comentarios de una tarea, del más antiguo al más reciente: autor, fecha, texto                               |
| `plane_add_comment`      | comenta como el usuario de la clave                                                                              |
| `plane_create_issue`     | crea una tarea, escribiendo estado, labels y responsables por nombre                                             |
| `plane_update_issue`     | cambia solo los campos que se pasan                                                                              |
| `plane_list_states`      | los estados del proyecto, con su grupo                                                                           |
| `plane_list_labels`      | los labels del proyecto                                                                                          |
| `plane_list_members`     | a quién se puede asignar: nombre visible y correo                                                                |

Ninguna de estas herramientas elimina nada.

## Entradas

| Herramienta                                                      | Entradas (además de `slug`)                                                                                                  |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `plane_list_my_issues`                                           | `project?`, `state_groups?` (por defecto: backlog, unstarted, started), `limit` (1–200, por defecto 50)                      |
| `plane_search_issues`                                            | `project`, `query?`, `assignee?` (nombre, correo o `"me"`), `state_groups?`, `limit` (1–200, por defecto 30)                 |
| `plane_get_issue`                                                | `key`                                                                                                                        |
| `plane_get_issue_images`                                         | `key`, `dir?` (una carpeta absoluta, se crea si no existe)                                                                   |
| `plane_list_comments`                                            | `key`                                                                                                                        |
| `plane_add_comment`                                              | `key`, `text`, `format` (`"text"`, por defecto, o `"markdown"`)                                                              |
| `plane_create_issue`                                             | `project`, `title`, `description?`, `state?`, `priority?`, `assignees?`, `labels?`, `start_date?`, `target_date?`            |
| `plane_update_issue`                                             | `key`, y luego cualquiera de `title`, `description`, `state`, `priority`, `assignees`, `labels`, `start_date`, `target_date` |
| `plane_list_states` / `plane_list_labels` / `plane_list_members` | `project`                                                                                                                    |

Los grupos de estado son `backlog`, `unstarted`, `started`, `completed` y `cancelled`. Las prioridades son
`urgent`, `high`, `medium`, `low` y `none`. Las fechas son `YYYY-MM-DD`.

## Cómo se resuelven los nombres

- **Proyectos** por identificador (`ACME`), nombre o id.
- **Estados** y **labels** por nombre, dentro del proyecto de la tarea.
- **Miembros** por `"me"`, correo, nombre visible, nombre completo o id.

Un valor que no coincide con nada falla con la lista de opciones válidas, para que el agente pueda
corregirse.

## Escritura

- `plane_create_issue` asigna al usuario de la clave a menos que se dé `assignees` (`[]` significa a nadie).
- En `plane_update_issue`, `assignees` y `labels` sustituyen la lista entera, `description` sustituye la
  descripción entera, y una fecha `null` la borra. No pasar ningún campo es un error.
- `description` es texto simple: cada línea se convierte en un párrafo.
- En `plane_add_comment`, `format: "text"` hace un párrafo por línea; `format: "markdown"` renderiza GFM
  (encabezados, listas, checkboxes, negrita) y escapa el HTML crudo.

## Imágenes

En `plane_get_issue`, cada imagen de la descripción se convierte en un marcador `[image n]` en el texto y se
lista en `images`. `plane_get_issue_images` las guarda en el mismo orden, como `image-<n>.<ext>`, para que el
agente pueda abrirlas con su herramienta de lectura de archivos. Detecta el tipo por la firma del archivo y
limita cada archivo a 20 MB. Una imagen fallida o externa no detiene a las demás.

En Plane 1.4.2 la descarga de assets documentada (`GET /workspaces/<ws>/assets/<id>/`) responde 500. Por eso el
servidor llama a `client.workItems.attachments.download`, que lee la redirección desde el detalle del adjunto y
sigue la URL firmada sin enviar la clave de API.

## Límites de peticiones y caché

Plane permite 60 peticiones por minuto. Ante un `429`, el servidor espera el `Retry-After` una vez (60 s como
máximo) y reintenta. Los proyectos, estados, labels, miembros y el usuario actual se cachean durante cinco
minutos, compartidos por cada petición que sirve el proceso.
