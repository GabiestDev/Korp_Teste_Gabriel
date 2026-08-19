using Korp.Estoque.API.Data;
using Korp.Estoque.API.DTOs;
using Korp.Estoque.API.Models;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Polly;

namespace Korp.Estoque.API.Controllers
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/[controller]")]
    [Authorize]
    public class EstoqueController : ControllerBase
    {
        private readonly EstoqueDbContext _context;
        private readonly ILogger<EstoqueController> _logger;
        private static readonly Polly.AsyncPolicy SalvarComRetry = Policy
            .Handle<Npgsql.NpgsqlException>(ex =>
                ex.IsTransient ||
                ex.SqlState == "08003" || // connection does not exist
                ex.SqlState == "08006" || // connection failure
                ex.SqlState == "53300")   // too many connections
            .WaitAndRetryAsync(3, attempt => TimeSpan.FromMilliseconds(100 * Math.Pow(2, attempt)));

        public EstoqueController(EstoqueDbContext context, ILogger<EstoqueController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet("produto")]
        public async Task<IActionResult> ListarProdutos([FromQuery] int? page = null, [FromQuery] int pageSize = 20)
        {
            var query = _context.Produtos.OrderBy(p => p.Id);

            if (page.HasValue)
            {
                var paginado = await query.ToPaginatedAsync(page.Value, pageSize);
                return Ok(ApiResponse.Ok("Produtos listados com sucesso.", paginado));
            }

            var produtos = await query.ToListAsync();
            return Ok(ApiResponse.Ok("Produtos listados com sucesso.", produtos));
        }

        [HttpPost("baixar")]
        public async Task<IActionResult> BaixarEstoque([FromBody] BaixarEstoqueDto dto)
        {
            // Idempotency handling
            var idempotencyKey = Request.Headers["X-Idempotency-Key"].FirstOrDefault();
            var requestBody = System.Text.Json.JsonSerializer.Serialize(dto);
            var requestHash = System.BitConverter.ToString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(requestBody))).Replace("-", "");
            var requestHeaders = string.Join(';', Request.Headers.Select(h => h.Key + ":" + string.Join(',', h.Value.ToArray())));

            if (!string.IsNullOrEmpty(idempotencyKey))
            {
                var existing = await _context.IdempotencyEntries
                    .FirstOrDefaultAsync(e => e.Key == idempotencyKey && e.Route == "baixar");
                if (existing != null)
                {
                    // if expired allow re-execution
                    if (existing.ExpiresAt != null && existing.ExpiresAt < DateTime.UtcNow)
                    {
                        // fallthrough to re-execute
                    }
                    else if (!string.IsNullOrEmpty(existing.RequestHash) && existing.RequestHash != requestHash)
                    {
                        return Conflict(ApiResponse.Error(409, "Idempotency key reused with different payload."));
                    }
                    else
                    {
                        return new ContentResult
                        {
                            StatusCode = existing.ResponseStatus,
                            Content = existing.ResponseBody,
                            ContentType = "application/json"
                        };
                    }
                }
            }

            var produto = await _context.Produtos.FindAsync(dto.ProdutoId);

            if (produto == null)
            {
                var notFound = ApiResponse.Error(404, "Produto não encontrado no estoque.");
                return NotFound(notFound);
            }

            if (produto.Saldo < dto.Quantidade)
            {
                var bad = ApiResponse.Error(400, $"Saldo insuficiente. Saldo atual: {produto.Saldo}");
                return BadRequest(bad);
            }

            produto.Saldo -= dto.Quantidade;

            try
            {
                await SalvarComRetry.ExecuteAsync(() => _context.SaveChangesAsync());
                var ok = ApiResponse.Ok("Estoque atualizado com sucesso.", produto);

                if (!string.IsNullOrEmpty(idempotencyKey))
                {
                    _context.IdempotencyEntries.Add(new Models.IdempotencyEntry
                    {
                        Key = idempotencyKey,
                        Route = "baixar",
                        RequestHash = requestHash,
                        RequestHeaders = requestHeaders,
                        ResponseStatus = 200,
                        ResponseBody = System.Text.Json.JsonSerializer.Serialize(ok),
                            ExpiresAt = DateTime.UtcNow.AddMinutes(60) // configurable expiry
                    });
                    await _context.SaveChangesAsync();
                }

                return Ok(ok);
            }
            catch (DbUpdateConcurrencyException)
            {
                var conflict = ApiResponse.Error(409, "Conflito de concorrência: O saldo deste produto foi atualizado por outra transação simultânea. Tente novamente.");
                return Conflict(conflict);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro interno ao atualizar estoque do produto {ProdutoId}.", dto.ProdutoId);
                var err = ApiResponse.Error(500, "Erro interno ao atualizar estoque.");
                return StatusCode(500, err);
            }
        }

        [HttpPost("produto")]
        public async Task<IActionResult> CadastrarProduto([FromBody] CadastrarProdutoDto dto)
        {
            var produto = new Produto
            {
                Codigo = dto.Codigo.Trim(),
                Descricao = dto.Descricao.Trim(),
                Saldo = dto.Saldo,
                DataCriacao = DateTime.UtcNow
            };

            var produtoExistente = await _context.Produtos
                .AnyAsync(p => p.Codigo.ToUpper() == produto.Codigo.ToUpper());

            if (produtoExistente)
                return Conflict(ApiResponse.Error(409, $"Produto com código {produto.Codigo} já cadastrado."));

            _context.Produtos.Add(produto);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(ListarProdutos), new { id = produto.Id }, ApiResponse.Created("Produto cadastrado com sucesso.", produto));
        }

        [HttpPost("estornar")]
        public async Task<IActionResult> Estornar([FromBody] BaixarEstoqueDto dto)
        {
            var idempotencyKey = Request.Headers["X-Idempotency-Key"].FirstOrDefault();
            var requestBody = System.Text.Json.JsonSerializer.Serialize(dto);
            var requestHash = System.BitConverter.ToString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(requestBody))).Replace("-", "");

            if (!string.IsNullOrEmpty(idempotencyKey))
            {
                var existing = await _context.IdempotencyEntries
                    .FirstOrDefaultAsync(e => e.Key == idempotencyKey && e.Route == "estornar");
                if (existing != null)
                {
                    if (existing.ExpiresAt != null && existing.ExpiresAt < DateTime.UtcNow)
                    {
                        // expired - allow re-execution
                    }
                    else if (!string.IsNullOrEmpty(existing.RequestHash) && existing.RequestHash != requestHash)
                    {
                        return Conflict(ApiResponse.Error(409, "Idempotency key reused with different payload."));
                    }
                    else
                    {
                        return new ContentResult
                        {
                            StatusCode = existing.ResponseStatus,
                            Content = existing.ResponseBody,
                            ContentType = "application/json"
                        };
                    }
                }
            }

            var produto = await _context.Produtos.FindAsync(dto.ProdutoId);

            if (produto == null)
            {
                var notFound = ApiResponse.Error(404, "Produto não encontrado no estoque.");
                return NotFound(notFound);
            }

            produto.Saldo += dto.Quantidade;

            try
            {
                await SalvarComRetry.ExecuteAsync(() => _context.SaveChangesAsync());
                var ok = ApiResponse.Ok("Estorno realizado com sucesso.", produto);

                if (!string.IsNullOrEmpty(idempotencyKey))
                {
                    _context.IdempotencyEntries.Add(new Models.IdempotencyEntry
                    {
                        Key = idempotencyKey,
                        Route = "estornar",
                        RequestHash = requestHash,
                        ResponseStatus = 200,
                        ResponseBody = System.Text.Json.JsonSerializer.Serialize(ok),
                        ExpiresAt = DateTime.UtcNow.AddMinutes(60)
                    });
                    await _context.SaveChangesAsync();
                }

                return Ok(ok);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro interno ao estornar estoque do produto {ProdutoId}.", dto.ProdutoId);
                var err = ApiResponse.Error(500, "Erro interno ao estornar estoque.");
                return StatusCode(500, err);
            }
        }
    }
}