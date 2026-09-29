---
sidebar_position: 8
title: Fehler
description: "Jeder Fehler des SDK erweitert PlaneError: API-Problemdetails, erfolglose Lookups, Netzwerkfehler und URLs, die sich nicht bauen lassen."
---

# Fehler

Jeder Fehler, den das SDK auslöst, erweitert `PlaneError`, und jede Klasse unten wird vom Paketstamm aus
exportiert.

| Fehler                      | Ausgelöst von | Wann                                                                                         |
| --------------------------- | ------------- | -------------------------------------------------------------------------------------------- |
| `PlaneApiError`             | v2            | die API hat mit einem Fehler geantwortet: ein RFC-9457-Problem-Detail                        |
| `NoMatchFoundError`         | v2            | ein `findBy*`-Lookup hat nichts getroffen                                                    |
| `MultipleMatchesFoundError` | v2            | ein `findBy*`-Lookup hat mehr als eine Zeile getroffen                                       |
| `PlaneNetworkError`         | v2            | die Anfrage hat nie einen Server erreicht: Verbindung verweigert, DNS-Fehler, Timeout, …     |
| `MissingPathIdError`        | v2            | eine URL kann nicht gebaut werden, weil eine Path-ID fehlt                                   |
| `HttpError`                 | v1            | eine v1-Anfrage ist fehlgeschlagen: der Statuscode, der Antwortkörper und die Antwort-Header |
| `AttachmentTooLargeError`   | v1            | `workItems.attachments.download` hat ihr `maxBytes` überschritten                            |

Alle sieben erweitern `PlaneError` direkt. Insbesondere sind die Lookup-Fehler **keine** Unterklassen von
`PlaneApiError`, sodass das Abfangen von diesem allein sie nicht abfängt.

## `PlaneApiError`

`PlaneApiError` trägt das Problem-Detail als `.status`, `.type`, `.code`, `.detail` und `.errors`, wobei
Letzteres die feldweisen Validierungsfehler sind, wenn der Server sie gesendet hat.

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

Ein Bulk-Schreibvorgang antwortet mit HTTP 200, selbst wenn Zeilen fehlschlagen. `v2.raiseForFailures(result)`
verwandelt einen Fehlschlag in einen `PlaneApiError` (siehe
[Memberships und Bulk-Schreibvorgänge](./memberships-and-bulk.md#bulk-schreibvorgänge)).
