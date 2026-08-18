using FluentAssertions;
using Korp.Estoque.API.Controllers;
using Korp.Estoque.API.Data;
using Korp.Estoque.API.DTOs;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Korp.Tests
{
    public class EstoqueControllerTests
    {
        private static EstoqueDbContext CriarDbContext()
        {
            var options = new DbContextOptionsBuilder<EstoqueDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            return new EstoqueDbContext(options);
        }

        private static EstoqueController CriarController(EstoqueDbContext db)
        {
            var controller = new EstoqueController(db, NullLogger<EstoqueController>.Instance);
            controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
            return controller;
        }

        private static void SetIdempotencyKey(EstoqueController controller, string key)
        {
            controller.HttpContext.Request.Headers["X-Idempotency-Key"] = key;
        }

        [Fact]
        public async Task CadastrarProduto_ComDadosValidos_CriaProduto()
        {
            var db = CriarDbContext();
            var controller = CriarController(db);

            var dto = new CadastrarProdutoDto { Codigo = "P-001", Descricao = "Produto Teste", Saldo = 10 };

            var result = await controller.CadastrarProduto(dto);

            var created = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            created.Value.Should().BeOfType<Korp.Estoque.API.Models.Produto>();
            db.Produtos.Count().Should().Be(1);
        }

        [Fact]
        public async Task CadastrarProduto_CodigoDuplicado_RetornaConflict()
        {
            var db = CriarDbContext();
            db.Produtos.Add(new Korp.Estoque.API.Models.Produto { Codigo = "P-001", Descricao = "Existente", Saldo = 5 });
            await db.SaveChangesAsync();
            var controller = CriarController(db);

            var dto = new CadastrarProdutoDto { Codigo = "P-001", Descricao = "Duplicado", Saldo = 1 };

            var result = await controller.CadastrarProduto(dto);

            result.Should().BeOfType<ConflictObjectResult>();
            db.Produtos.Count().Should().Be(1);
        }

        [Fact]
        public async Task BaixarEstoque_ComSaldoSuficiente_ReduzSaldo()
        {
            var db = CriarDbContext();
            db.Produtos.Add(new Korp.Estoque.API.Models.Produto { Codigo = "P-002", Descricao = "Teste", Saldo = 10 });
            await db.SaveChangesAsync();
            var controller = CriarController(db);

            var dto = new BaixarEstoqueDto { ProdutoId = 1, Quantidade = 3 };
            var result = await controller.BaixarEstoque(dto);

            result.Should().BeOfType<OkObjectResult>();
            db.Produtos.Single().Saldo.Should().Be(7);
        }

        [Fact]
        public async Task BaixarEstoque_ComSaldoInsuficiente_RetornaBadRequest()
        {
            var db = CriarDbContext();
            db.Produtos.Add(new Korp.Estoque.API.Models.Produto { Codigo = "P-003", Descricao = "Teste", Saldo = 2 });
            await db.SaveChangesAsync();
            var controller = CriarController(db);

            var dto = new BaixarEstoqueDto { ProdutoId = 1, Quantidade = 5 };
            var result = await controller.BaixarEstoque(dto);

            result.Should().BeOfType<BadRequestObjectResult>();
            db.Produtos.Single().Saldo.Should().Be(2);
        }

        [Fact]
        public async Task BaixarEstoque_ProdutoInexistente_RetornaNotFound()
        {
            var db = CriarDbContext();
            var controller = CriarController(db);

            var dto = new BaixarEstoqueDto { ProdutoId = 999, Quantidade = 1 };
            var result = await controller.BaixarEstoque(dto);

            result.Should().BeOfType<NotFoundObjectResult>();
        }

        [Fact]
        public async Task BaixarEstoque_ReplayComMesmaChave_RetornaMesmaResposta()
        {
            var db = CriarDbContext();
            db.Produtos.Add(new Korp.Estoque.API.Models.Produto { Codigo = "P-004", Descricao = "Teste", Saldo = 10 });
            await db.SaveChangesAsync();

            var controller1 = CriarController(db);
            SetIdempotencyKey(controller1, "chave-abc");
            var dto = new BaixarEstoqueDto { ProdutoId = 1, Quantidade = 2 };
            var r1 = await controller1.BaixarEstoque(dto);
            r1.Should().BeOfType<OkObjectResult>();

            // Replay in a new controller (new request) with same key
            var controller2 = CriarController(db);
            SetIdempotencyKey(controller2, "chave-abc");
            var r2 = await controller2.BaixarEstoque(dto);

            r2.Should().BeOfType<ContentResult>();
            var content = r2 as ContentResult;
            content!.StatusCode.Should().Be(200);
            db.Produtos.Single().Saldo.Should().Be(8);
        }

        [Fact]
        public async Task Estornar_AdicionaSaldo()
        {
            var db = CriarDbContext();
            db.Produtos.Add(new Korp.Estoque.API.Models.Produto { Codigo = "P-005", Descricao = "Teste", Saldo = 1 });
            await db.SaveChangesAsync();
            var controller = CriarController(db);

            var dto = new BaixarEstoqueDto { ProdutoId = 1, Quantidade = 4 };
            var result = await controller.Estornar(dto);

            result.Should().BeOfType<OkObjectResult>();
            db.Produtos.Single().Saldo.Should().Be(5);
        }

        [Fact]
        public async Task Estornar_ReplayComMesmaChave_RetornaMesmaResposta()
        {
            var db = CriarDbContext();
            db.Produtos.Add(new Korp.Estoque.API.Models.Produto { Codigo = "P-006", Descricao = "Teste", Saldo = 1 });
            await db.SaveChangesAsync();

            var controller1 = CriarController(db);
            SetIdempotencyKey(controller1, "chave-estorno");
            var dto = new BaixarEstoqueDto { ProdutoId = 1, Quantidade = 4 };
            var r1 = await controller1.Estornar(dto);
            r1.Should().BeOfType<OkObjectResult>();

            var controller2 = CriarController(db);
            SetIdempotencyKey(controller2, "chave-estorno");
            var r2 = await controller2.Estornar(dto);

            r2.Should().BeOfType<ContentResult>();
            var content = r2 as ContentResult;
            content!.StatusCode.Should().Be(200);
            db.Produtos.Single().Saldo.Should().Be(5);
        }
    }
}