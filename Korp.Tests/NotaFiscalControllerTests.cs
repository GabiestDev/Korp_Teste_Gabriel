using FluentAssertions;
using Korp.Faturamento.API.Controllers;
using Korp.Faturamento.API.Data;
using Korp.Faturamento.API.DTOs;
using Korp.Faturamento.API.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Korp.Tests
{
    public class NotaFiscalControllerTests
    {
        private static FaturamentoDbContext CriarDbContext()
        {
            var options = new DbContextOptionsBuilder<FaturamentoDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            return new FaturamentoDbContext(options);
        }

        private static NotaFiscalController CriarController(FaturamentoDbContext db)
        {
            var services = new ServiceCollection();
            services.AddHttpClient("EstoqueClient", c => c.BaseAddress = new Uri("http://localhost:5090"));
            var provider = services.BuildServiceProvider();
            var httpClientFactory = provider.GetRequiredService<IHttpClientFactory>();

            var controller = new NotaFiscalController(db, httpClientFactory, NullLogger<NotaFiscalController>.Instance);
            controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
            return controller;
        }

        private static void SetIdempotencyKey(NotaFiscalController controller, string key)
        {
            controller.HttpContext.Request.Headers["X-Idempotency-Key"] = key;
        }

        [Fact]
        public async Task CriarNota_ComItensValidos_CriaNotaAberta()
        {
            var db = CriarDbContext();
            var controller = CriarController(db);

            var dto = new CriarNotaFiscalDto
            {
                Itens = new List<ItemNotaFiscalDto>
                {
                    new() { ProdutoId = 1, Quantidade = 2 },
                    new() { ProdutoId = 2, Quantidade = 1 }
                }
            };

            var result = await controller.CriarNota(dto);

            var created = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var envelope = created.Value.Should().BeOfType<ApiResponse<object>>().Subject;
            envelope.StatusCode.Should().Be(201);
            var nota = envelope.Data.Should().BeOfType<NotaFiscal>().Subject;
            nota.Status.Should().Be(StatusNota.Aberta);
            nota.Itens.Count.Should().Be(2);
            db.NotasFiscais.Count().Should().Be(1);
        }

        [Fact]
        public async Task CriarNota_ReplayComMesmaChave_RetornaMesmaResposta()
        {
            var db = CriarDbContext();
            var dto = new CriarNotaFiscalDto
            {
                Itens = new List<ItemNotaFiscalDto> { new() { ProdutoId = 1, Quantidade = 1 } }
            };

            var controller1 = CriarController(db);
            SetIdempotencyKey(controller1, "chave-nota");
            var r1 = await controller1.CriarNota(dto);
            r1.Should().BeOfType<CreatedAtActionResult>();

            var controller2 = CriarController(db);
            SetIdempotencyKey(controller2, "chave-nota");
            var r2 = await controller2.CriarNota(dto);

            r2.Should().BeOfType<ContentResult>();
            var content = r2 as ContentResult;
            content!.StatusCode.Should().Be(201);
            db.NotasFiscais.Count().Should().Be(1);
        }

        [Fact]
        public async Task CriarNota_MesmaChavePayloadDiferente_RetornaConflict()
        {
            var db = CriarDbContext();
            var controller = CriarController(db);
            SetIdempotencyKey(controller, "chave-conflito");

            var dto1 = new CriarNotaFiscalDto
            {
                Itens = new List<ItemNotaFiscalDto> { new() { ProdutoId = 1, Quantidade = 1 } }
            };
            var r1 = await controller.CriarNota(dto1);
            r1.Should().BeOfType<CreatedAtActionResult>();

            var dto2 = new CriarNotaFiscalDto
            {
                Itens = new List<ItemNotaFiscalDto> { new() { ProdutoId = 1, Quantidade = 5 } }
            };
            var r2 = await controller.CriarNota(dto2);

            r2.Should().BeOfType<ConflictObjectResult>();
            db.NotasFiscais.Count().Should().Be(1);
        }

        [Fact]
        public async Task ObterNota_Inexistente_RetornaNotFound()
        {
            var db = CriarDbContext();
            var controller = CriarController(db);

            var result = await controller.ObterNota(999);

            result.Should().BeOfType<NotFoundObjectResult>();
        }

        [Fact]
        public async Task ListarTodas_RetornaNotasComItens()
        {
            var db = CriarDbContext();
            db.NotasFiscais.Add(new NotaFiscal
            {
                Status = StatusNota.Aberta,
                Itens = new List<NotaFiscalItem> { new() { ProdutoId = 1, Quantidade = 3 } }
            });
            await db.SaveChangesAsync();
            var controller = CriarController(db);

            var result = await controller.ListarTodas();

            var ok = result.Should().BeOfType<OkObjectResult>().Subject;
            var envelope = ok.Value.Should().BeOfType<ApiResponse<List<NotaFiscal>>>().Subject;
            envelope.StatusCode.Should().Be(200);
            envelope.Data.Should().NotBeNull();
            envelope.Data!.Count.Should().Be(1);
            envelope.Data![0].Itens.Count.Should().Be(1);
        }
    }
}