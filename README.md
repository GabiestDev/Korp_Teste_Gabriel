# Korp - Estoque & Faturamento

Este repositório contém dois microsserviços (.NET) e um frontend Angular para gerenciar produtos e notas fiscais:

- Korp.Estoque.API — serviço de Estoque (produtos, saldos, endpoints de baixar/estornar)
- Korp.Faturamento.API — serviço de Faturamento (criação de notas, impressão)
- Korp-Frontend-Gabriel — frontend Angular (UI para cadastro de produtos, notas e impressão.

## Notas sobre concorrência, idempotência e tratamento de falhas

- Concorrência: Produto.Saldo possui proteção via concorrência otimista; o fluxo de impressão faz retries e, em caso de partial success, executa estorno para compensar alterações já aplicadas.
- Idempotência: Endpoints importantes aceitam header `X-Idempotency-Key` e gravam entradas na tabela `IdempotencyEntries` para evitar efeitos colaterais em replays. Política: mesma chave + mesmo payload retorna resposta armazenada; mesma chave + payload diferente retorna 409 Conflict.
- Falhas: se o Estoque estiver offline, o Faturamento retorna 503 com mensagem clara. O sistema não implementa 2PC; usa compensação eventual.

## Rodando com Docker (portátil)

O compose foi configurado para permitir rodar em qualquer máquina. Configure onde está a pasta do frontend com a variável FRONTEND_CONTEXT.

1) Opção simples e portátil (recomendado):
   - Coloque o frontend dentro do repositório em `./Korp-Frontend-Gabriel` ou mantenha o frontend num local qualquer e aponte o caminho na variável FRONTEND_CONTEXT.

2) Como usar:
   - Copie `.env.example` para `.env` e ajuste FRONTEND_CONTEXT se necessário:
     copy .env.example .env   (Windows PowerShell)
     cp .env.example .env     (macOS/Linux)

   - Se o frontend estiver na raiz do repositório na pasta `Korp-Frontend-Gabriel`, não é necessário alterar `.env`.

3) Subir a stack (recomendado usar os scripts):
   - Windows PowerShell: .\run-compose.ps1
   - macOS/Linux: ./run-compose.sh

   Ou manualmente:
   docker compose --env-file .env up --build -d

4) Se o frontend estiver em outro local e quiser copiar para o repositório automaticamente (recomendado para portabilidade):
   - Windows PowerShell: .\import-frontend.ps1 "D:\\repos\\Korp_Teste_Gabriel\\Korp-Frontend-Gabriel"
   - macOS/Linux: ./import-frontend.sh "/path/to/Korp-Frontend-Gabriel"
   - Os scripts copiam o conteúdo para ./Korp-Frontend-Gabriel e excluem node_modules, .git, dist e caches.

5) Checagens e endpoints:
   - Frontend: http://localhost:4200
   - Estoque health: http://localhost:5090/health
   - Faturamento health: http://localhost:5164/health

5) Parar e remover:
   docker compose down -v

Se preferir que o frontend seja movido automaticamente para dentro do repositório (por exemplo copiado para ./frontend durante um script), posso adicionar essa etapa, mas normalmente é melhor que o frontend exista no repositório (ou como submódulo) para evitar cópias repetidas e grandes node_modules no histórico do Git.
