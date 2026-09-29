---
sidebar_position: 8
title: Erros
description: "Todos os erros que o SDK lança estendem PlaneError: detalhes de problema da API, pesquisas sem resultado, falhas de rede e URLs impossíveis de construir."
---

# Erros

Todo o erro que o SDK lança estende `PlaneError`, e toda a classe abaixo é exportada na raiz do pacote.

| Erro                        | Lançado por | Quando                                                                                   |
| --------------------------- | ----------- | ---------------------------------------------------------------------------------------- |
| `PlaneApiError`             | v2          | a API respondeu com um erro: um problem detail RFC 9457                                  |
| `NoMatchFoundError`         | v2          | uma procura `findBy*` não encontrou nada                                                 |
| `MultipleMatchesFoundError` | v2          | uma procura `findBy*` encontrou mais de uma linha                                        |
| `PlaneNetworkError`         | v2          | o pedido nunca chegou a um servidor: ligação recusada, falha de DNS, timeout, …          |
| `MissingPathIdError`        | v2          | não é possível construir o URL porque falta um id de caminho                             |
| `HttpError`                 | v1          | um pedido v1 falhou: o código de estado, o corpo da resposta e os cabeçalhos da resposta |
| `AttachmentTooLargeError`   | v1          | `workItems.attachments.download` excedeu o respetivo `maxBytes`                          |

Os sete estendem `PlaneError` diretamente. Em particular, os erros de procura **não** são subclasses de
`PlaneApiError`, pelo que capturar apenas esse não os captura.

## `PlaneApiError`

`PlaneApiError` transporta o problem detail em `.status`, `.type`, `.code`, `.detail` e `.errors`, sendo este
último os erros de validação por campo, quando o servidor os envia.

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

Uma escrita em lote responde HTTP 200 mesmo quando linhas falham. `v2.raiseForFailures(result)` transforma uma
falha num `PlaneApiError` (veja [Memberships e escritas em lote](./memberships-and-bulk.md#escritas-em-lote)).
