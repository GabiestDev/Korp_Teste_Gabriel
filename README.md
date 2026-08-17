# Korp - Estoque & Faturamento

Este repositório contém dois microsserviços (.NET) e um frontend Angular para gerenciar produtos e notas fiscais:

- Korp.Estoque.API — serviço de Estoque (produtos, saldos, endpoints de baixar/estornar)
- Korp.Faturamento.API — serviço de Faturamento (criação de notas, impressão)
- Korp-Frontend-Gabriel — frontend Angular (UI para cadastro de produtos, notas e impressão)

> Observação: há um projeto de testes de integração criado (IntegrationTests) dentro de Korp.Estoque.API; houve uma tentativa de movê-lo para `tests/integration/estoque` mas a operação não foi concluída neste ambiente. Veja a seção "Testes" abaixo para detalhes e localização atual dos arquivos de teste.

## Sumário

- Requisitos atendidos
- Pré-requisitos locais
- Configuração do banco (Postgres)
- Executando os microsserviços
- Executando migrações EF Core
- Frontend (Angular) — execução e ajustes visuais
- Testes (unitários / integração / concorrência)
- Notas sobre idempotência / concorrência / falhas
- Próximos passos


## Requisitos atendidos

Funcionalidades obrigatórias implementadas e validadas:
- Cadastro de Produtos (Código, Descrição, Saldo)
- Cadastro de Notas Fiscais (numeração sequencial gerada pelo DB, status Aberta/Fechada, itens múltiplos)
- Impressão de Notas com:
  - Indicador de processamento
  - Atualização de status para Fechada após impressão bem-sucedida
  - Não permitir impressão quando status != Aberta
  - Atualização de saldo dos produtos conforme quantidades utilizadas
- Arquitetura com dois microsserviços (Estoque e Faturamento)
- Persistência em PostgreSQL (Npgsql / EF Core)
- Tratamento de falhas: se o serviço de Estoque estiver indisponível, o Faturamento responde com 503 e fornece feedback amigável

Recursos opcionais implementados:
- (a) Tratamento de concorrência: Produto.Saldo usa concorrência otimista e o fluxo de impressão inclui retry/compensação para evitar contas duplas.
- (c) Idempotência básica: endpoints suportam header `X-Idempotency-Key` e gravam `IdempotencyEntry` para evitar efeitos colaterais em replays.


## Pré-requisitos locais

- .NET 6 SDK/Runtime (recomendado para executar serviços e testes de integração)
- PostgreSQL rodando localmente ou acessível
- Node.js e npm (para o frontend Angular)


## Configuração do banco (Postgres)

1. Ajuste `appsettings.json` / `appsettings.Development.json` dos serviços com a connection string do Postgres.
2. Para aplicar migrations (em cada serviço):

```powershell
cd D:\repos\Korp_Teste_Gabriel\Korp.Estoque.API
dotnet ef database update

cd D:\repos\Korp_Teste_Gabriel\Korp.Faturamento.API
dotnet ef database update
```

> Nota: durante desenvolvimento algumas rotinas utilizam EnsureCreated para facilitar, mas as migrations foram geradas e aplicadas para a tabela de idempotência e demais mudanças.


## Executando os microsserviços

- Estoque (por padrão escuta em http://localhost:5164)
- Faturamento (por padrão escuta em http://localhost:5090)

Rodar cada serviço (pelo VS Code / dotnet CLI):

```powershell
cd D:\repos\Korp_Teste_Gabriel\Korp.Estoque.API
dotnet run

cd D:\repos\Korp_Teste_Gabriel\Korp.Faturamento.API
dotnet run
```

Certifique-se de que ambos os serviços conseguem conectar ao Postgres.


## Frontend (Angular)

1. Entrar na pasta do frontend:

```powershell
cd D:\repos\Korp_Teste_Gabriel\Korp-Frontend-Gabriel
npm install
npm run start
```

2. O frontend está configurado para apontar para os endpoints locais dos microsserviços (http://localhost:5164 e http://localhost:5090). Se necessário, ajuste `environment.ts`.

Alterações visuais realizadas:
- Gradiente do header alterado para (#2b485a → #ff0c46)
- Botões primários alterados para cor #2b485a
- Inputs com background diferenciado em todas as páginas
- Espaçamento (5px) entre campos de Código/Descrição/Saldo na página de produtos
- Espaçamento entre botão de cadastrar produto e a tabela
- Tabela arredondada
- Rodapé atualizado: "Sistema desenvolvido por Gabriel Neto" com link para LinkedIn que abre em nova aba; texto "Sistema desenvolvido por" em preto
- Removido o "K" e o texto "Microsserviços" do header


## Testes

- Teste de integração de concorrência criado: original em `D:\repos\Korp_Teste_Gabriel\Korp.Estoque.API\IntegrationTests.csproj` e `IntegrationTests.cs` (local atual).

  - Cenário: cria produto com saldo=1, cria duas notas e dispara duas impressões concorrentes. Verifica que apenas uma impressão fecha a nota e que o saldo final do produto é 0.
  - Como executar (na máquina local onde os serviços estejam em execução):

```powershell
cd D:\repos\Korp_Teste_Gabriel\Korp.Estoque.API
dotnet test IntegrationTests.csproj
```

- Observação: houve uma tentativa de mover este projeto para `tests/integration/estoque`, porém a operação não foi concluída automaticamente neste ambiente. Se desejar mover manualmente:

```powershell
# crie a pasta tests/integration/estoque no root do repositório
mkdir D:\repos\Korp_Teste_Gabriel\tests\integration\estoque
# mova os arquivos
move D:\repos\Korp_Teste_Gabriel\Korp.Estoque.API\IntegrationTests.csproj D:\repos\Korp_Teste_Gabriel\tests\integration\estoque\
move D:\repos\Korp_Teste_Gabriel\Korp.Estoque.API\IntegrationTests.cs D:\repos\Korp_Teste_Gabriel\tests\integration\estoque\
# depois rode o teste a partir da nova pasta
cd D:\repos\Korp_Teste_Gabriel\tests\integration\estoque
dotnet test
```


## Notas sobre concorrência, idempotência e tratamento de falhas

- Concorrência: Produto.Saldo possui proteção via concorrência otimista; o fluxo de impressão faz retries e, em caso de partial success, executa estorno para compensar alterações já aplicadas.
- Idempotência: Endpoints importantes aceitam header `X-Idempotency-Key` e gravam entradas na tabela `IdempotencyEntries` para evitar efeitos colaterais em replays. Política: mesma chave + mesmo payload retorna resposta armazenada; mesma chave + payload diferente retorna 409 Conflict.
- Falhas: se o Estoque estiver offline, o Faturamento retorna 503 com mensagem clara. O sistema não implementa 2PC; usa compensação eventual.


## Próximos passos recomendados

- Mover o projeto de testes para `tests/integration/estoque` (se desejar que os testes fiquem organizados fora da pasta do serviço). Se preferir posso completar essa movimentação localmente (preciso de permissão para criar pastas / mover arquivos no ambiente).
- Substituir inline styles por tema global do Angular Material para limpeza do CSS.
- Adicionar testes E2E com Playwright/Cypress cobrindo fluxos principais.
- Adicionar rotina de limpeza/expiração das entradas de idempotência no banco.


---

Se quiser que eu prossiga agora com a movimentação automática dos testes para `tests/integration/estoque`, posso tentar novamente (preciso criar diretórios e mover arquivos). Deseja que eu tente mover os arquivos agora? (Se sim, responda "Sim mover"; caso contrário, prossigo com o commit das mudanças atuais e envio o README final).