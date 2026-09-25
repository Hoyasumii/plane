---
sidebar_position: 8
title: Erros
---

# Erros

Todo erro que o SDK lança estende `PlaneError`, e toda classe abaixo é exportada na raiz do pacote.

| Erro                        | Lançado por | Quando                                                                              |
| --------------------------- | ----------- | ----------------------------------------------------------------------------------- |
| `PlaneApiError`             | v2          | a API respondeu um erro: um problem detail RFC 9457                                 |
| `NoMatchFoundError`         | v2          | uma busca `findBy*` não encontrou nada                                              |
| `MultipleMatchesFoundError` | v2          | uma busca `findBy*` encontrou mais de uma linha                                     |
| `PlaneNetworkError`         | v2          | a requisição nunca chegou a um servidor: conexão recusada, falha de DNS, timeout, … |
| `MissingPathIdError`        | v2          | não dá para montar a URL porque falta um id do caminho                              |
| `HttpError`                 | v1          | uma requisição v1 falhou: o status, o corpo da resposta e os headers da resposta    |
| `AttachmentTooLargeError`   | v1          | `workItems.attachments.download` passou do `maxBytes`                               |

Os sete estendem `PlaneError` diretamente. Em particular, os erros de busca **não** são subclasses de
`PlaneApiError`, então capturar só esse não os pega.

## `PlaneApiError`

`PlaneApiError` expõe o problem detail em `.status`, `.type`, `.code`, `.detail` e `.errors`, este último com os
erros de validação por campo quando o servidor os envia.

```ts
import { PlaneApiError, PlaneNetworkError } from "@hoyasumii/plane";

try {
  await client.v2.workspaces.projects.states.create("acme", "ENG", { name: "", color: "#000000" });
} catch (error) {
  if (error instanceof PlaneApiError) {
    console.log(error.status, error.code, error.detail, error.errors);
  } else if (error instanceof PlaneNetworkError) {
    console.log("inacessível:", error.message, error.cause);
  } else {
    throw error;
  }
}
```

Uma escrita em lote responde HTTP 200 mesmo quando linhas falham. `v2.raiseForFailures(result)` transforma uma
falha num `PlaneApiError` (veja [Memberships e escritas em lote](./memberships-and-bulk.md#escritas-em-lote)).
