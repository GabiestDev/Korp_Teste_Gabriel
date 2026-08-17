# Korp - Estoque & Faturamento

Este repositório contém dois microsserviços (.NET) e um frontend Angular para gerenciar produtos e notas fiscais:

- Korp.Estoque.API — serviço de Estoque (produtos, saldos, endpoints de baixar/estornar)
- Korp.Faturamento.API — serviço de Faturamento (criação de notas, impressão)
- Korp-Frontend-Gabriel — frontend Angular (UI para cadastro de produtos, notas e impressão.

## Notas sobre concorrência, idempotência e tratamento de falhas

- Concorrência: Produto.Saldo possui proteção via concorrência otimista; o fluxo de impressão faz retries e, em caso de partial success, executa estorno para compensar alterações já aplicadas.
- Idempotência: Endpoints importantes aceitam header `X-Idempotency-Key` e gravam entradas na tabela `IdempotencyEntries` para evitar efeitos colaterais em replays. Política: mesma chave + mesmo payload retorna resposta armazenada; mesma chave + payload diferente retorna 409 Conflict.
- Falhas: se o Estoque estiver offline, o Faturamento retorna 503 com mensagem clara. O sistema não implementa 2PC; usa compensação eventual.
