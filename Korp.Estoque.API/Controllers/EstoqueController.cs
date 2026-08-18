using Korp.Estoque.API.Data;
using Korp.Estoque.API.DTOs;
using Korp.Estoque.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Korp.Estoque.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EstoqueController : ControllerBase
    {
        private readonly EstoqueDbContext _context;
        private readonly ILogger<EstoqueController> _logger;

        public EstoqueController(EstoqueDbContext context, ILogger<EstoqueController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet("produto")]
        public async Task<IActionResult> ListarProdutos()
        {
            var produtos = await _context.Produtos
                .OrderBy(p => p.Id)
                .ToListAsync();

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
                if (!string.IsNullOrEmpty(idempotencyKey))
                {
                    _context.IdempotencyEntries.Add(new Models.IdempotencyEntry
                    {
                        Key = idempotencyKey,
                        Route = "baixar",
                        RequestHash = requestHash,
                        RequestHeaders = requestHeaders,
                        ResponseStatus = 404,
                        ResponseBody = System.Text.Json.JsonSerializer.Serialize(notFound),
                        ExpiresAt = DateTime.UtcNow.AddMinutes(30)
                    });
                    await _context.SaveChangesAsync();
                }

                return NotFound(notFound);
            }

            if (produto.Saldo < dto.Quantidade)
            {
                var bad = ApiResponse.Error(400, $"Saldo insuficiente. Saldo atual: {produto.Saldo}");
                if (!string.IsNullOrEmpty(idempotencyKey))
                {
                    _context.IdempotencyEntries.Add(new Models.IdempotencyEntry
                    {
                        Key = idempotencyKey,
                        Route = "baixar",
                        RequestHash = requestHash,
                        RequestHeaders = requestHeaders,
                        ResponseStatus = 400,
                        ResponseBody = System.Text.Json.JsonSerializer.Serialize(bad),
                        ExpiresAt = DateTime.UtcNow.AddMinutes(30)
                    });
                    await _context.SaveChangesAsync();
                }

                return BadRequest(bad);
            }

            produto.Saldo -= dto.Quantidade;

            try
            {
                await _context.SaveChangesAsync();
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
                if (!string.IsNullOrEmpty(idempotencyKey))
                {
                    _context.IdempotencyEntries.Add(new Models.IdempotencyEntry
                    {
                        Key = idempotencyKey,
                        Route = "baixar",
                        ResponseStatus = 409,
                        ResponseBody = System.Text.Json.JsonSerializer.Serialize(conflict)
                    });
                    await _context.SaveChangesAsync();
                }

                return Conflict(conflict);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro interno ao atualizar estoque do produto {ProdutoId}.", dto.ProdutoId);
                var err = ApiResponse.Error(500, "Erro interno ao atualizar estoque.");
                if (!string.IsNullOrEmpty(idempotencyKey))
                {
                    _context.IdempotencyEntries.Add(new Models.IdempotencyEntry
                    {
                        Key = idempotencyKey,
                        Route = "baixar",
                        ResponseStatus = 500,
                        ResponseBody = System.Text.Json.JsonSerializer.Serialize(err)
                    });
                    await _context.SaveChangesAsync();
                }

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
                if (!string.IsNullOrEmpty(idempotencyKey))
                {
                    _context.IdempotencyEntries.Add(new Models.IdempotencyEntry
                    {
                        Key = idempotencyKey,
                        Route = "estornar",
                        RequestHash = requestHash,
                        ResponseStatus = 404,
                        ResponseBody = System.Text.Json.JsonSerializer.Serialize(notFound),
                        ExpiresAt = DateTime.UtcNow.AddMinutes(30)
                    });
                    await _context.SaveChangesAsync();
                }

                return NotFound(notFound);
            }

            produto.Saldo += dto.Quantidade;

            try
            {
                await _context.SaveChangesAsync();
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
                if (!string.IsNullOrEmpty(idempotencyKey))
                {
                    _context.IdempotencyEntries.Add(new Models.IdempotencyEntry
                    {
                        Key = idempotencyKey,
                        Route = "estornar",
                        ResponseStatus = 500,
                        ResponseBody = System.Text.Json.JsonSerializer.Serialize(err)
                    });
                    await _context.SaveChangesAsync();
                }

                return StatusCode(500, err);
            }
        }
    }
}