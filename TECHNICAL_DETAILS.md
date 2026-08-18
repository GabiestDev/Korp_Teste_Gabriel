# Detalhamento Técnico

> Caminhos relativos à raiz do repositório. Ex.: `Korp-Frontend-Gabriel/src/...`

1) Ciclos de vida do Angular utilizados
- Os componentes usam o construtor para disparar o carregamento inicial de dados (ex.: [produtos.ts](Korp-Frontend-Gabriel/src/app/pages/produtos/produtos.ts) e [notas-fiscais.ts](Korp-Frontend-Gabriel/src/app/pages/notas-fiscais/notas-fiscais.ts)).
- `ngAfterViewInit` é implementado para conectar `MatSort` e `MatPaginator` às tabelas (`MatTableDataSource`).

2) Uso de RxJS
- RxJS é usado no frontend para trabalhar com fluxos assíncronos retornados pelo HttpClient.
  - Serviços retornam Observables tipados (ex.: [produto.ts](Korp-Frontend-Gabriel/src/app/services/produto.ts), [nota-fiscal.ts](Korp-Frontend-Gabriel/src/app/services/nota-fiscal.ts)).
  - Estado reativo é mantido com signals (`signal`/`computed`), ex.: `produtos`, `notas`, `itensAdicionados`, `imprimindoId`.
  - Uso de operadores: `switchMap` para encadear ações seguidas de reload e `finalize` para limpar estado de "imprimindo" (ver `imprimir` em [notas-fiscais.ts](Korp-Frontend-Gabriel/src/app/pages/notas-fiscais/notas-fiscais.ts)).
- Erros HTTP são tratados globalmente pelo interceptor [http-error.interceptor.ts](Korp-Frontend-Gabriel/src/app/core/interceptors/http-error.interceptor.ts), que exibe uma snackbar com a mensagem da API.

3) Outras bibliotecas utilizadas e finalidade
- Backend (.NET):
  - Microsoft.EntityFrameworkCore (EF Core) — ORM para persistência.
  - Npgsql — provider PostgreSQL para EF Core.
  - Polly / Polly.Extensions.Http — políticas de resiliência (retry e circuit-breaker) usadas pelo HttpClient (ver [Korp.Faturamento.API/Program.cs](Korp.Faturamento.API/Program.cs)).
  - Microsoft.Extensions.Logging — logging e registros de erro.
- Frontend (Angular):
  - @angular/* (core, common, router, http) — framework Angular.
  - zone.js — runtime requerido pelo Angular.
  - rxjs — programação reativa.
  - @angular/material — biblioteca de componentes visuais (ver seção abaixo).

4) Bibliotecas para componentes visuais
- Angular Material é usado para a UI. Exemplos de módulos importados nos componentes:
  - MatToolbarModule, MatButtonModule (barra e botões) — em [app.ts](Korp-Frontend-Gabriel/src/app/app.ts).
  - MatTableModule, MatPaginatorModule, MatSortModule (tabelas com paginação e ordenação), MatInputModule, MatFormFieldModule, MatSelectModule, MatProgressSpinnerModule — em [produtos.ts](Korp-Frontend-Gabriel/src/app/pages/produtos/produtos.ts) e [notas-fiscais.ts](Korp-Frontend-Gabriel/src/app/pages/notas-fiscais/notas-fiscais.ts).
- A identidade visual segue a paleta da marca Korp (cores definidas como variáveis CSS `--korp-*` em [styles.css](Korp-Frontend-Gabriel/src/styles.css)) e o tema M3 é gerado a partir das cores da marca em [_theme-colors.scss](Korp-Frontend-Gabriel/_theme-colors.scss).

5) Gerenciamento de dependências em Golang
- Não aplicável. Não foram encontrados arquivos Go (go.mod) no repositório.

6) Frameworks usados em Golang ou C#
- C# / .NET:
  - ASP.NET Core (modelo minimal/Program.cs) para hospedar APIs (ver [Korp.Estoque.API/Program.cs](Korp.Estoque.API/Program.cs) e [Korp.Faturamento.API/Program.cs](Korp.Faturamento.API/Program.cs)).
  - Entity Framework Core (EF Core) para acesso a dados e migrations/persistência.
  - Npgsql para PostgreSQL.
  - Polly para resiliência HTTP no cliente (Faturamento).

7) Tratamento de erros e exceções no backend
- Validação e respostas explícitas: os controllers retornam BadRequest/NotFound/Conflict/Created conforme validações e resultados esperados (ex.: validação de campos, saldo insuficiente, produto não encontrado). DTOs usam DataAnnotations (`[Required]`, `[Range]`, `[MaxLength]`).
- Try/catch granular nos controllers:
  - Ex.: em [EstoqueController](Korp.Estoque.API/Controllers/EstoqueController.cs) as operações de persistência são envolvidas em try/catch que trata `DbUpdateConcurrencyException` separadamente (retorna 409) e `Exception` (retorna 500, logada via ILogger sem vazar detalhes), gravando respostas de idempotência quando necessário.
  - Em [NotaFiscalController](Korp.Faturamento.API/Controllers/NotaFiscalController.cs) há tratamento de `HttpRequestException` e `Polly.CircuitBreaker.BrokenCircuitException` (retornam 503 quando o serviço de Estoque está indisponível) e `Exception` geral (500 logada).
- Inicialização resiliente: em `Program.cs` há blocos try/catch que aplicam as migrations (`db.Database.Migrate()`) — erros na conexão ao PostgreSQL são logados e o serviço permanece em modo degradado, com endpoint `/health` que verifica a conectividade real do banco.
- Idempotência e compensação: quando uma operação crítica (ex.: impressão de nota) falha parcialmente, o código executa compensações (estornos) para reverter alterações já aplicadas (ver `CompensarItens` em [NotaFiscalController](Korp.Faturamento.API/Controllers/NotaFiscalController.cs)).
- Políticas de retry/circuit-breaker (Polly) são aplicadas no HttpClient do Faturamento para chamadas ao Estoque (ver [Program.cs do Faturamento](Korp.Faturamento.API/Program.cs)).

8) Uso de LINQ (caso C#)
- Sim — o projeto usa LINQ extensivamente para consultas e transformações:
  - `dto.Itens.Select(...)` (construção de entities a partir do DTO) em [NotaFiscalController](Korp.Faturamento.API/Controllers/NotaFiscalController.cs).
  - Consultas com `OrderBy`, `Include`, `FirstOrDefaultAsync`, `AnyAsync` e `ToListAsync` (ex.: em [EstoqueController](Korp.Estoque.API/Controllers/EstoqueController.cs)).

9) Testes
- Unit tests (frontend): Vitest via `ng test` — 9 testes em [Korp-Frontend-Gabriel/src/app](Korp-Frontend-Gabriel/src/app) (serviços e componentes).
- Unit tests (backend): xUnit em [Korp.Tests](Korp.Tests) cobrindo cadastro/baixa/estorno de estoque, idempotência e criação/consulta de notas com EF InMemory.
- Testes de integração/concorrência: [Korp.Estoque.API/IntegrationTests.cs](Korp.Estoque.API/IntegrationTests.cs) (xUnit, roda contra os serviços em execução).
- E2E (frontend): Playwright em [Korp-Frontend-Gabriel/e2e](Korp-Frontend-Gabriel/e2e), executado com `npm run e2e` contra `http://localhost:4200`.
