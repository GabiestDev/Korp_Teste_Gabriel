# Korp - Controle de Estoque e Faturamento

Sistema de controle de estoque e emissão de notas fiscais, composto por dois microsserviços (.NET) e um frontend web (Angular), tudo orquestrado com Docker Compose.

O sistema permite cadastrar produtos, acompanhar o saldo em estoque, criar notas fiscais com múltiplos itens e imprimir (fechar) essas notas baixando automaticamente o estoque dos produtos envolvidos.

## Arquitetura

| Componente | Tecnologia | Porta | Função |
|---|---|---|---|
| `Korp.Estoque.API` | .NET (ASP.NET Core) | 5090 | Microsserviço de Estoque: produtos, saldos, baixa e estorno |
| `Korp.Faturamento.API` | .NET (ASP.NET Core) | 5164 | Microsserviço de Faturamento: notas fiscais, itens, impressão |
| `Korp-Frontend-Gabriel` | Angular + Angular Material | 4200 | Interface web para produtos e notas fiscais |
| `db` | PostgreSQL 15 | 5432 | Banco de dados (bases `EstoqueDB` e `FaturamentoDB`) |

Os dois microsserviços compartilham a mesma infraestrutura de dados (PostgreSQL), cada um com seu próprio banco e suas próprias migrations do Entity Framework Core. O Faturamento consome o Estoque via HTTP para baixar o saldo dos produtos durante a impressão de uma nota.

## Funcionalidades

### Estoque (`Korp.Estoque.API`)
- **Cadastro de produtos** — código único, descrição e saldo inicial.
- **Listagem de produtos** — ordenada por ID, usada pelo frontend e pelo Faturamento.
- **Baixa de estoque** — reduz o saldo de um produto, com validação de saldo insuficiente.
- **Estorno de estoque** — devolve a quantidade baixada ao saldo (usado como compensação em falhas).

### Faturamento (`Korp.Faturamento.API`)
- **Criação de nota fiscal** — nota com status `Aberta`, contendo um ou mais itens (produto + quantidade); o número sequencial é gerado automaticamente.
- **Listagem de notas** — todas as notas com seus itens (com paginação opcional).
- **Consulta de nota por ID**.
- **Impressão / fechamento de nota** — apenas notas `Aberta` podem ser impressas; ao imprimir, o sistema baixa o estoque de cada item e muda a nota para `Fechada`.

### Frontend (`Korp-Frontend-Gabriel`)
- **Login** — tela de autenticação; o token JWT é guardado no `localStorage` e enviado em todas as requisições. Sessão expirada é detectada (validação do `exp`) e redireciona para `/login`.
- **Página `/produtos`** — tabela de produtos e formulário para cadastrar novos (código, descrição, saldo) com validação reativa.
- **Página `/notas-fiscais`** (tela inicial) — lista as notas com número sequencial, itens, status e ações; permite adicionar itens (produto + quantidade), criar nota e imprimir.

## Segurança

- **Autenticação JWT** — `POST /api/auth/login` valida credenciais e emite um token assinado. Todas as rotas protegidas exigem `Authorization: Bearer <token>`. Usuário demo padrão: `gabriel` / `senha123` (configurável via `Auth__Username`/`Auth__Password`). O token expira em 8 horas por padrão (`Jwt__ExpiresHours`).
- O Faturamento propaga o token recebido ao chamar o Estoque, e o header `X-Request-Id` é repassado para correlação de logs (Serilog).
- **Swagger** — o documento OpenAPI declara o esquema de segurança `bearer`, então o Swagger UI (`/swagger`) exibe o botão **Authorize**; cole apenas o token (o prefixo `Bearer ` é adicionado automaticamente).
- **Rate limit no login** — `POST /api/auth/login` é limitado a 30 tentativas por minuto por IP (responde `429 Too Many Requests` em excesso).
- **Sessão expirada (frontend)** — o app valida o claim `exp` do token JWT; token vencido é removido do `localStorage` e o usuário é redirecionado para `/login`.
- Os endpoints de escrita importantes aceitam o header opcional `X-Idempotency-Key` para garantir idempotência em replays.

## Tratamento de concorrência, idempotência e falhas

- **Concorrência** — o campo `Produto.Saldo` usa `[ConcurrencyCheck]` (concorrência otimista). Se duas transações tentarem baixar o estoque ao mesmo tempo, uma recebe `409 Conflict`; o Faturamento trata isso com retries e backoff.
- **Idempotência** — os endpoints de baixa de estoque e criação/impressão de nota aceitam o header `X-Idempotency-Key`. Apenas operações **confirmadas** (sucesso) são gravadas em `IdempotencyEntries`, permitindo que replays retornem o resultado original. Falhas (404/400/409/500) **não** são cacheadas — assim, retries re-executam a operação de verdade. Mesma chave com payload diferente retorna `409 Conflict`.
- **Falhas / compensação** — se o Estoque estiver offline, o Faturamento retorna `503`. O sistema não usa transação distribuída (2PC): durante a impressão, se um item falhar após outros terem baixado estoque, o sistema executa **estorno automático** dos itens já processados — inclusive quando a falha ocorre depois (erro de rede, circuit-breaker ou falha ao fechar a nota).

## Endpoints

### Estoque (`http://localhost:5090`)
| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/auth/login` | Autentica e retorna um token JWT (público) |
| `GET` | `/api/estoque/produto` | Lista produtos (paginação opcional: `?page=&pageSize=`) |
| `POST` | `/api/estoque/produto` | Cadastra produto (`codigo`, `descricao`, `saldo`) |
| `POST` | `/api/estoque/baixar` | Baixa estoque (`produtoId`, `quantidade`) |
| `POST` | `/api/estoque/estornar` | Estorna estoque (`produtoId`, `quantidade`) |

### Faturamento (`http://localhost:5164`)
| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/notafiscal` | Cria nota fiscal (`itens`: lista de `produtoId` + `quantidade`) |
| `GET` | `/api/notafiscal` | Lista todas as notas (paginação opcional: `?page=&pageSize=`) |
| `GET` | `/api/notafiscal/{id}` | Consulta nota por ID |
| `POST` | `/api/notafiscal/{id}/imprimir` | Imprime e fecha a nota (baixa estoque dos itens) |

> As rotas acima exigem `Authorization: Bearer <token>` (exceto o login). Para obter um token:
> `POST /api/auth/login` com `{"username":"gabriel","senha":"senha123"}`.

## Como rodar

### Pré-requisitos
- Docker Desktop (ou Docker Engine + Docker Compose plugin)

### Passo a passo

1. **Clone o repositório e entre na pasta.**

2. **Configure o frontend.** O frontend Angular faz parte deste repositório em `./Korp-Frontend-Gabriel`, portanto não é necessário configuração extra. Se ele estiver em outro local, copie `.env.example` para `.env` e aponte a variável `FRONTEND_CONTEXT` para a pasta do frontend.

   ```powershell
   Copy-Item .env.example .env   # Windows PowerShell
   ```
   ```bash
   cp .env.example .env          # macOS/Linux
   ```

3. **Suba a stack.**

   ```powershell
   .\run-compose.ps1             # Windows PowerShell
   ```
   ```bash
   ./run-compose.sh              # macOS/Linux
   ```

   Ou manualmente:

   ```bash
   docker compose --env-file .env up --build -d
   ```

4. **Acesse o sistema.**
   - Frontend: http://localhost:4200
   - Swagger Estoque: http://localhost:5090/swagger
   - Swagger Faturamento: http://localhost:5164/swagger
   - Estoque (health): http://localhost:5090/health
   - Faturamento (health): http://localhost:5164/health

### Parar a stack

```bash
docker compose down -v
```

> `-v` remove também os volumes do banco, apagando os dados persistidos.

## Importando o frontend de outro local

Se o frontend estiver fora do repositório e você quiser copiá-lo para dentro (deixando o projeto portátil), use os scripts de importação — eles copiam o conteúdo para `./Korp-Frontend-Gabriel` ignorando `node_modules`, `.git`, `dist` e caches.

```powershell
.\import-frontend.ps1 "D:\repos\Korp_Teste_Gabriel\Korp-Frontend-Gabriel"
```
```bash
./import-frontend.sh "/path/to/Korp-Frontend-Gabriel"
```

## Estrutura do repositório

```
├── Korp.Estoque.API/          # Microsserviço de Estoque (.NET)
│   ├── Controllers/           # AuthController, EstoqueController
│   ├── Data/                  # EstoqueDbContext, DatabaseBootstrap, migrations, middlewares
│   ├── DTOs/                  # DTOs, validadores (FluentValidation), paginação
│   ├── Models/                # Produto, IdempotencyEntry
│   └── Dockerfile
├── Korp.Faturamento.API/      # Microsserviço de Faturamento (.NET)
│   ├── Controllers/           # NotaFiscalController
│   ├── Data/                  # FaturamentoDbContext, DatabaseBootstrap, migrations, middlewares
│   ├── DTOs/                  # DTOs, validadores (FluentValidation), paginação
│   ├── Models/                # NotaFiscal, NotaFiscalItem, StatusNota, IdempotencyEntry
│   └── Dockerfile
├── Korp-Frontend-Gabriel/     # Frontend Angular
│   ├── src/app/
│   │   ├── core/              # auth/loading/http-error interceptors, auth.service, guards
│   │   ├── pages/             # login, produtos e notas-fiscais
│   │   └── services/          # produto e nota-fiscal (consomem as APIs)
│   ├── e2e/                   # testes E2E (Playwright)
│   └── default.conf           # nginx (cache dos assets + index.html no-cache)
├── Korp.Tests/                # Testes unitários do backend (xUnit)
├── .github/workflows/         # CI (GitHub Actions)
├── docker/postgres-init/      # init.sql (cria EstoqueDB e FaturamentoDB)
├── docker-compose.yml         # orquestração da stack
├── .env.example               # configuração de contexto do frontend
├── .dockerignore              # reduz o contexto de build (cache do CI)
├── run-compose.ps1 / .sh      # scripts para subir a stack
└── import-frontend.ps1 / .sh  # scripts para importar o frontend
```