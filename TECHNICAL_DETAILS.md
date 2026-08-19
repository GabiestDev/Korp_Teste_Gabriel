# Detalhamento Técnico

> Caminhos relativos à raiz do repositório. Ex.: `Korp-Frontend-Gabriel/src/...`

1) Ciclos de vida do Angular utilizados
- Os componentes usam o construtor para disparar o carregamento inicial de dados (ex.: [produtos.ts](Korp-Frontend-Gabriel/src/app/pages/produtos/produtos.ts) e [notas-fiscais.ts](Korp-Frontend-Gabriel/src/app/pages/notas-fiscais/notas-fiscais.ts)).
- `ngAfterViewInit` é implementado para conectar `MatSort` e `MatPaginator` às tabelas (`MatTableDataSource`).
- Formulários usam **Reactive Forms** (`ReactiveFormsModule` + `FormBuilder`), com validação declarativa (`Validators.required`, `Validators.min`, `Validators.maxLength`) e `markAllAsTouched()` no submit inválido.

2) Uso de RxJS
- RxJS é usado no frontend para trabalhar com fluxos assíncronos retornados pelo HttpClient.
  - Serviços retornam Observables tipados (ex.: [produto.ts](Korp-Frontend-Gabriel/src/app/services/produto.ts), [nota-fiscal.ts](Korp-Frontend-Gabriel/src/app/services/nota-fiscal.ts)).
  - Estado reativo é mantido com signals (`signal`/`computed`), ex.: `produtos`, `notas`, `itensAdicionados`, `imprimindoId`, `token`, `autenticado`.
  - Uso de operadores: `switchMap` para encadear ações seguidas de reload e `finalize` para limpar estado de "imprimindo" (ver `imprimir` em [notas-fiscais.ts](Korp-Frontend-Gabriel/src/app/pages/notas-fiscais/notas-fiscais.ts)).
- Erros HTTP são tratados globalmente pelo interceptor [http-error.interceptor.ts](Korp-Frontend-Gabriel/src/app/core/interceptors/http-error.interceptor.ts), que exibe um diálogo (modal) com a mensagem e o status retornados pela API no envelope `ApiResponse`. Todas as subscriptions dos componentes possuem handler de `error` (sem erros não tratados no console), e o redirecionamento de sessão expirada é deduplicado (flag módulo-scope) para evitar múltiplos diálogos quando várias requisições falham em paralelo.

3) Autenticação JWT
- O login real acontece no Estoque: `POST /api/auth/login` ([AuthController.cs](Korp.Estoque.API/Controllers/AuthController.cs)) valida credenciais em configuração (`Auth__Username`/`Auth__Password`, padrão `gabriel`/`senha123`) e emite um token JWT assinado com `Jwt__Key`. O token expira em 8 horas por padrão (`Jwt__ExpiresHours`).
- Os controllers `EstoqueController` e `NotaFiscalController` usam `[Authorize]` + JWT Bearer (validado via `Microsoft.AspNetCore.Authentication.JwtBearer`).
- O Faturamento **propaga o token** recebido ao chamar o Estoque (baixa de estoque) via `PropagarAutorizacao`, além de repassar o `X-Request-Id`.
- **Rate limit no login** — `AddRateLimiter` registra a política `login` (janela fixa de 30 requisições/minuto por IP, retorno `429 Too Many Requests`), aplicada via `[EnableRateLimiting("login")]` no `AuthController`.
- No frontend, [auth.service.ts](Korp-Frontend-Gabriel/src/app/core/services/auth.service.ts) guarda o token em `localStorage` e valida o claim `exp` do JWT (com decodificação base64url correta, tratando `-`/`_` e padding): token vencido é removido do `localStorage` e `autenticado` fica `false`. O interceptor [auth.interceptor.ts](Korp-Frontend-Gabriel/src/app/core/interceptors/auth.interceptor.ts) anexa `Authorization: Bearer <token>` em toda requisição (somente se o token ainda for válido). Em `401` (exceto na própria rota de login), o [http-error.interceptor.ts](Korp-Frontend-Gabriel/src/app/core/interceptors/http-error.interceptor.ts) faz `logout` e redireciona para `/login`. A rota de login e o guard de autenticação protegem as páginas internas.

4) Logging estruturado e rastreabilidade
- Serilog com `WriteTo.Console` (outputTemplate estruturado) é configurado em ambas as APIs via `builder.Host.UseSerilog(...)`.
- Um `RequestIdMiddleware` ([RequestIdMiddleware.cs](Korp.Estoque.API/Data/RequestIdMiddleware.cs)) gera/repassa o header `X-Request-Id`, e o log enriquece cada registro com esse ID (correlação entre Faturamento → Estoque).
- O frontend adota `LOCALE_ID: 'pt-BR'` (com `@angular/common/locales/global/pt`) para formatação de datas/números em português brasileiro.

5) Validação robusta de DTOs
- **FluentValidation** (`FluentValidation.AspNetCore`) com validadores por DTO ([Validators.cs](Korp.Estoque.API/DTOs/Validators.cs) nas duas APIs), registrados via `AddValidatorsFromAssemblyContaining` + `AddFluentValidationAutoValidation` (em `IServiceCollection`).
- O `ApiValidationFilter` ([Data/ApiValidationFilter.cs](Korp.Estoque.API/Data/ApiValidationFilter.cs)) converte erros de validação em HTTP 400 dentro do envelope `ApiResponse` (`statusCode`, `message`, `timestamp`, `data`).

6) Paginação no backend
- Os endpoints de listagem (`GET /api/estoque/produto` e `GET /api/notafiscal`) aceitam `?page=` e `?pageSize=` (padrão 20, máx. 100) via `ToPaginatedAsync`, retornando `PaginatedResult<T>` com `items/total/page/pageSize/totalPages`. Sem o parâmetro `page`, retornam a lista completa (compatibilidade).

7) Versionamento de API
- `Asp.Versioning.Mvc` com versão default `1.0` (`AssumeDefaultVersionWhenUnspecified`), `ReportApiVersions` habilitado e `[ApiVersion("1.0")]` nos controllers — os endpoints existentes continuam funcionando sem header de versão.
- **OpenAPI / Swagger** — documento OpenAPI v1 gerado nativamente (`AddOpenApi` + `MapOpenApi`), com Swagger UI em `/swagger`. O esquema de segurança JWT (`bearer`, http/bearer/JWT) é registrado via `AddDocumentTransformer` usando a API do **Microsoft.OpenApi v2** (sem `OpenApiReference`): `OpenApiSecurityScheme` em `document.Components.SecuritySchemes["bearer"]` e `OpenApiSecuritySchemeReference("bearer", document, null)` adicionado a `document.Security` — o que habilita o botão **Authorize** no Swagger para as rotas protegidas.

8) Resiliência
- HttpClient do Faturamento usa Polly (retry + circuit-breaker) para chamadas ao Estoque.
- O Estoque usa Polly (`SalvarComRetry`) para reintentar operações de persistência (`SaveChangesAsync` de baixa/estorno) diante de falhas transientes do Npgsql (connection failure/out-of-memory), mantendo `DbUpdateConcurrencyException` → 409 sem retry.

9) Inicialização do banco (EnsureCreated vs Migrate)
- `DatabaseBootstrap` ([Data/DatabaseBootstrap.cs](Korp.Estoque.API/Data/DatabaseBootstrap.cs)) nas duas APIs: se a base já existe mas foi criada via `EnsureCreated` (sem histórico de migrations), ele sela `__EFMigrationsHistory` com todas as migrations (ProductVersion da versão atual) e então reaplica `Migrate()` — unificando as duas estratégias sem reconstruir o schema.

10) Outras bibliotecas utilizadas e finalidade
- Backend (.NET):
  - Microsoft.EntityFrameworkCore (EF Core) — ORM para persistência.
  - Npgsql — provider PostgreSQL para EF Core.
  - Polly / Polly.Extensions.Http — políticas de resiliência (retry e circuit-breaker).
  - FluentValidation.AspNetCore — validação declarativa de DTOs.
  - Asp.Versioning.Mvc — versionamento de API.
  - Serilog.AspNetCore — logging estruturado.
  - Microsoft.AspNetCore.Authentication.JwtBearer — autenticação JWT.
  - Microsoft.AspNetCore.RateLimiting — rate limit do login (política `login`).
- Frontend (Angular):
  - @angular/* (core, common, router, http, forms) — framework Angular.
  - zone.js — runtime requerido pelo Angular.
  - rxjs — programação reativa.
  - @angular/material — biblioteca de componentes visuais (ver seção abaixo).

11) Bibliotecas para componentes visuais
- Angular Material é usado para a UI. Exemplos de módulos importados nos componentes:
  - MatToolbarModule, MatButtonModule (barra e botões) — em [app.ts](Korp-Frontend-Gabriel/src/app/app.ts).
  - MatTableModule, MatPaginatorModule, MatSortModule (tabelas com paginação e ordenação), MatInputModule, MatFormFieldModule, MatSelectModule, MatProgressSpinnerModule, MatProgressBarModule (loading global) — em [app.ts](Korp-Frontend-Gabriel/src/app/app.ts), [produtos.ts](Korp-Frontend-Gabriel/src/app/pages/produtos/produtos.ts) e [notas-fiscais.ts](Korp-Frontend-Gabriel/src/app/pages/notas-fiscais/notas-fiscais.ts).
- Loading global: [loading.service.ts](Korp-Frontend-Gabriel/src/app/core/services/loading.service.ts) + interceptor [loading.interceptor.ts](Korp-Frontend-Gabriel/src/app/core/interceptors/loading.interceptor.ts) controlam um `mat-progress-bar` indeterminado exibido durante requisições HTTP.
- A identidade visual segue a paleta da marca Korp (cores definidas como variáveis CSS `--korp-*` em [styles.css](Korp-Frontend-Gabriel/src/styles.css)) e o tema M3 é gerado a partir das cores da marca em [_theme-colors.scss](Korp-Frontend-Gabriel/_theme-colors.scss).

12) Gerenciamento de dependências em Golang
- Não aplicável. Não foram encontrados arquivos Go (go.mod) no repositório.

13) Frameworks usados em Golang ou C#
- C# / .NET:
  - ASP.NET Core (modelo minimal/Program.cs) para hospedar APIs (ver [Korp.Estoque.API/Program.cs](Korp.Estoque.API/Program.cs) e [Korp.Faturamento.API/Program.cs](Korp.Faturamento.API/Program.cs)).
  - Entity Framework Core (EF Core) para acesso a dados e migrations/persistência.
  - Npgsql para PostgreSQL.
  - Polly para resiliência HTTP (cliente do Faturamento e persistência do Estoque).

14) Tratamento de erros e exceções no backend
- Validação e respostas explícitas: os controllers retornam BadRequest/NotFound/Conflict/Created conforme validações e resultados esperados. DTOs usam FluentValidation + DataAnnotations.
- Try/catch granular nos controllers:
  - Ex.: em [EstoqueController](Korp.Estoque.API/Controllers/EstoqueController.cs) as operações de persistência são envolvidas em try/catch que trata `DbUpdateConcurrencyException` separadamente (retorna 409) e `Exception` (retorna 500, logada via ILogger sem vazar detalhes), gravando respostas de idempotência quando necessário.
  - Em [NotaFiscalController](Korp.Faturamento.API/Controllers/NotaFiscalController.cs) há tratamento de `HttpRequestException` e `Polly.CircuitBreaker.BrokenCircuitException` (retornam 503 quando o serviço de Estoque está indisponível) e `Exception` geral (500 logada).
- Inicialização resiliente: `DatabaseBootstrap.EnsureMigrated()` (com try/catch em `Program.cs`) — erros na conexão ao PostgreSQL são logados e o serviço permanece em modo degradado, com endpoint `/health` que verifica a conectividade real do banco.
- Idempotência e compensação: apenas operações **confirmadas** (sucesso) gravam resposta em `IdempotencyEntries` para replay — falhas (404/400/409/500) **não** são cacheadas, permitindo que retries re-executem a operação. Quando uma operação crítica (ex.: impressão de nota) falha parcialmente, o código executa compensações (estornos) para reverter alterações já aplicadas — `CompensarItens` em [NotaFiscalController](Korp.Faturamento.API/Controllers/NotaFiscalController.cs) roda tanto na falha de um item quanto nos `catch` de `HttpRequestException`/`BrokenCircuitException` (503) e `Exception` geral (500).

15) Uso de LINQ (caso C#)
- Sim — o projeto usa LINQ extensivamente para consultas e transformações:
  - `dto.Itens.Select(...)` (construção de entities a partir do DTO) em [NotaFiscalController](Korp.Faturamento.API/Controllers/NotaFiscalController.cs).
  - Consultas com `OrderBy`, `Include`, `Skip`/`Take` (paginação), `FirstOrDefaultAsync`, `AnyAsync`, `CountAsync` e `ToListAsync` (ex.: em [EstoqueController](Korp.Estoque.API/Controllers/EstoqueController.cs) e [PaginatedResult.cs](Korp.Estoque.API/DTOs/PaginatedResult.cs)).

16) Testes
- Unit tests (frontend): Vitest via `ng test` — 23 testes em [Korp-Frontend-Gabriel/src/app](Korp-Frontend-Gabriel/src/app) (serviços, componentes, login e formulários reativos).
- Unit tests (backend): xUnit em [Korp.Tests](Korp.Tests) cobrindo cadastro/baixa/estorno de estoque, idempotência e criação/consulta de notas com EF InMemory.
- Testes de integração/concorrência: [Korp.Estoque.API/IntegrationTests.cs](Korp.Estoque.API/IntegrationTests.cs) (xUnit, autenticado via JWT, roda contra os serviços em execução).
- E2E (frontend): Playwright em [Korp-Frontend-Gabriel/e2e](Korp-Frontend-Gabriel/e2e), executado com `npm run e2e` contra `http://localhost:4200`.
- CI: GitHub Actions em [.github/workflows/ci.yml](.github/workflows/ci.yml) — jobs de backend (build + unit tests), frontend (build + unit tests) e e2e (compose + integração + Playwright). O job de integração/e2e instala .NET 6 e .NET 10 (`dotnet-version` via bloco escalar), e os browsers do Playwright são cacheados com `actions/cache` (`~/.cache/ms-playwright`) — o `.dockerignore` reduz o contexto de build do compose.