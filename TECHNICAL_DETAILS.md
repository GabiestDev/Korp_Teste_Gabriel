# Detalhamento Técnico


1) Ciclos de vida do Angular utilizados
- Apenas o ciclo OnInit é utilizado nos componentes vistos (ex.: [ProdutosComponent](D:/repos/Korp_Teste_Gabriel.worktrees/docker-check-update-docs-tech-details/Korp-Frontend-Gabriel/src/app/pages/produtos/produtos.ts) e [NotasFiscaisComponent](D:/repos/Korp_Teste_Gabriel.worktrees/docker-check-update-docs-tech-details/Korp-Frontend-Gabriel/src/app/pages/notas-fiscais/notas-fiscais.ts)). Os componentes implementam ngOnInit para carregar dados iniciais.
- Não foram encontrados usos de ngOnDestroy, AfterViewInit ou outros hooks além do OnInit.

2) Uso de RxJS
- RxJS é usado no frontend para trabalhar com fluxos assíncronos retornados pelo HttpClient.
  - Serviços retornam Observables (ex.: [ProdutoService.listar](D:/repos/Korp_Teste_Gabriel.worktrees/docker-check-update-docs-tech-details/Korp-Frontend-Gabriel/src/app/services/produto.ts)).
  - Foi usado BehaviorSubject para sinalizar estado reativo (ex.: `isPrintingSubject` em [NotaFiscalService](D:/repos/Korp_Teste_Gabriel.worktrees/docker-check-update-docs-tech-details/Korp-Frontend-Gabriel/src/app/services/nota-fiscal.ts) e exposição via `isPrinting$`).
  - Uso de operadores: `catchError`, `finalize` e `throwError` em pipes para tratamento de erros e limpeza (ver `imprimirNota` em [NotaFiscalService](D:/repos/Korp_Teste_Gabriel.worktrees/docker-check-update-docs-tech-details/Korp-Frontend-Gabriel/src/app/services/nota-fiscal.ts)).
- Nos components, as chamadas ao backend usam `.subscribe()` com handlers next/error para reagir aos resultados.

3) Outras bibliotecas utilizadas e finalidade
- Backend (.NET):
  - Microsoft.EntityFrameworkCore (EF Core) — ORM para persistência.
  - Npgsql — provider PostgreSQL para EF Core.
  - Polly / Polly.Extensions.Http — políticas de resiliência (retry e circuit-breaker) usadas pelo HttpClient (ver [Korp.Faturamento.API/Program.cs](D:/repos/Korp_Teste_Gabriel.worktrees/docker-check-update-docs-tech-details/Korp.Faturamento.API/Program.cs)).
  - Microsoft.Extensions.Logging — logging e registros de erro.
- Frontend (Angular):
  - @angular/* (core, common, router, http) — framework Angular.
  - zone.js — runtime requerido pelo Angular.
  - rxjs — programação reativa.
  - @angular/material — biblioteca de componentes visuais (ver seção abaixo).

4) Bibliotecas para componentes visuais
- Angular Material é usado para a UI. Exemplos de módulos importados nos componentes:
  - MatToolbarModule, MatButtonModule (barra e botões) — em [app.ts](D:/repos/Korp_Teste_Gabriel.worktrees/docker-check-update-docs-tech-details/Korp-Frontend-Gabriel/src/app/app.ts).
  - MatTableModule (tabelas), MatInputModule, MatFormFieldModule (campos de formulário), MatSelectModule, MatProgressSpinnerModule — em [produtos.ts](D:/repos/Korp_Teste_Gabriel.worktrees/docker-check-update-docs-tech-details/Korp-Frontend-Gabriel/src/app/pages/produtos/produtos.ts) e [notas-fiscais.ts](D:/repos/Korp_Teste_Gabriel.worktrees/docker-check-update-docs-tech-details/Korp-Frontend-Gabriel/src/app/pages/notas-fiscais/notas-fiscais.ts).

5) Gerenciamento de dependências em Golang
- Não aplicável. Não foram encontrados arquivos Go (go.mod) no repositório.

6) Frameworks usados em Golang ou C#
- C# / .NET:
  - ASP.NET Core (modelo minimal/Program.cs) para hospedar APIs (ver [Korp.Estoque.API/Program.cs](D:/repos/Korp_Teste_Gabriel.worktrees/docker-check-update-docs-tech-details/Korp.Estoque.API/Program.cs) e [Korp.Faturamento.API/Program.cs](D:/repos/Korp_Teste_Gabriel.worktrees/docker-check-update-docs-tech-details/Korp.Faturamento.API/Program.cs)).
  - Entity Framework Core (EF Core) para acesso a dados e migrations/persistência.
  - Npgsql para PostgreSQL.
  - Polly para resiliência HTTP no cliente (Faturamento).

7) Tratamento de erros e exceções no backend
- Validação e respostas explícitas: os controllers retornam BadRequest/NotFound/Conflict/Created conforme validações e resultados esperados (ex.: validação de campos, saldo insuficiente, produto não encontrado).
- Try/catch granular nos controllers:
  - Ex.: em [EstoqueController](D:/repos/Korp_Teste_Gabriel.worktrees/docker-check-update-docs-tech-details/Korp.Estoque.API/Controllers/EstoqueController.cs) as operações de persistência são envolvidas em try/catch que trata `DbUpdateConcurrencyException` separadamente (retorna 409) e `Exception` (retorna 500), gravando respostas de idempotência quando necessário.
  - Em [NotaFiscalController](D:/repos/Korp_Teste_Gabriel.worktrees/docker-check-update-docs-tech-details/Korp.Faturamento.API/Controllers/NotaFiscalController.cs) há tratamento de `HttpRequestException` (retorna 503 quando o serviço de Estoque está indisponível) e `Exception` geral (500).
- Inicialização resiliente: em `Program.cs` há blocos try/catch ao criar o banco (EnsureCreated) — erros na conexão ao PostgreSQL são logados e o serviço permanece em modo degradado, com endpoint /health indicando estado degradado.
- Idempotência e compensação: quando uma operação crítica (ex.: impressão de nota) falha parcialmente, o código executa compensaçõess (estornos) para reverter alterações já aplicadas (ver loop de impressão em [NotaFiscalController](D:/repos/Korp_Teste_Gabriel.worktrees/docker-check-update-docs-tech-details/Korp.Faturamento.API/Controllers/NotaFiscalController.cs)).
- Políticas de retry/circuit-breaker (Polly) são aplicadas no HttpClient do Faturamento para chamadas ao Estoque (ver [Program.cs do Faturamento](D:/repos/Korp_Teste_Gabriel.worktrees/docker-check-update-docs-tech-details/Korp.Faturamento.API/Program.cs)).

8) Uso de LINQ (caso C#)
- Sim — o projeto usa LINQ extensivamente para consultas e transformações:
  - `dto.Itens.Select(...)` (construção de entities a partir do DTO) em [NotaFiscalController](D:/repos/Korp_Teste_Gabriel.worktrees/docker-check-update-docs-tech-details/Korp.Faturamento.API/Controllers/NotaFiscalController.cs).
  - Consultas com `OrderBy`, `Include`, `FirstOrDefaultAsync`, `AnyAsync` e `ToListAsync` (ex.: em [EstoqueController](D:/repos/Korp_Teste_Gabriel.worktrees/docker-check-update-docs-tech-details/Korp.Estoque.API/Controllers/EstoqueController.cs)).

