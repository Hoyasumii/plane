---
sidebar_position: 8
title: Erreurs
description: "Toutes les erreurs levées par le SDK étendent PlaneError : détails de problème de l'API, recherches sans résultat, pannes réseau et URL impossibles à construire."
---

# Erreurs

Chaque erreur que le SDK lève étend `PlaneError`, et chaque classe ci-dessous est exportée depuis la racine du
paquet.

| Erreur                      | Levée par | Quand                                                                                             |
| --------------------------- | --------- | ------------------------------------------------------------------------------------------------- |
| `PlaneApiError`             | v2        | l'API a répondu une erreur : un détail de problème RFC 9457                                       |
| `NoMatchFoundError`         | v2        | une recherche `findBy*` n'a rien trouvé                                                           |
| `MultipleMatchesFoundError` | v2        | une recherche `findBy*` a trouvé plus d'une ligne                                                 |
| `PlaneNetworkError`         | v2        | la requête n'a jamais atteint un serveur : connexion refusée, échec DNS, délai dépassé, …         |
| `MissingPathIdError`        | v2        | une URL ne peut pas être construite car un id de chemin manque                                    |
| `HttpError`                 | v1        | une requête v1 a échoué : le code de statut, le corps de la réponse et les en-têtes de la réponse |
| `AttachmentTooLargeError`   | v1        | `workItems.attachments.download` a dépassé son `maxBytes`                                         |

Les sept étendent `PlaneError` directement. En particulier, les erreurs de recherche ne sont **pas** des
sous-classes de `PlaneApiError`, donc attraper celle-ci seule ne les attrape pas.

## `PlaneApiError`

`PlaneApiError` porte le détail du problème comme `.status`, `.type`, `.code`, `.detail` et `.errors`, ce
dernier étant les erreurs de validation par champ quand le serveur les a envoyées.

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

Une écriture en bloc répond HTTP 200 même quand des lignes échouent. `v2.raiseForFailures(result)` transforme
un échec en `PlaneApiError` (voir [Memberships et écritures en bloc](./memberships-and-bulk.md#écritures-en-bloc)).
