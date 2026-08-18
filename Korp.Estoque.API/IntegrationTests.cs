using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Xunit;
using FluentAssertions;

public class IntegrationConcurrencyTests
{
    private const string EstoqueUrl = "http://localhost:5090";
    private const string FaturamentoUrl = "http://localhost:5164";

    [Fact]
    public async Task ConcurrentPrints_OneSucceeds_OneFails_ProductConsistent()
    {
        using var http = new HttpClient();

        // create product saldo=1
        var uniqueCode = "IT-CT-" + Guid.NewGuid().ToString("N").Substring(0,8);
        var prod = new { Codigo = uniqueCode, Descricao = "Produto Conc Test", Saldo = 1 };
        var created = await http.PostAsJsonAsync($"{EstoqueUrl}/api/estoque/produto", prod);
        created.EnsureSuccessStatusCode();
        var createdObj = await created.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        int produtoId = createdObj.GetProperty("id").GetInt32();

        // create two notas
        var notaPayload = new { Itens = new[] { new { ProdutoId = produtoId, Quantidade = 1 } } };
        var n1 = await http.PostAsJsonAsync($"{FaturamentoUrl}/api/NotaFiscal", notaPayload);
        n1.EnsureSuccessStatusCode();
        var n1Obj = await n1.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        int id1 = n1Obj.GetProperty("id").GetInt32();

        var n2 = await http.PostAsJsonAsync($"{FaturamentoUrl}/api/NotaFiscal", notaPayload);
        n2.EnsureSuccessStatusCode();
        var n2Obj = await n2.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        int id2 = n2Obj.GetProperty("id").GetInt32();

        // run prints concurrently
        var t1 = http.PostAsync($"{FaturamentoUrl}/api/NotaFiscal/{id1}/imprimir", null);
        var t2 = http.PostAsync($"{FaturamentoUrl}/api/NotaFiscal/{id2}/imprimir", null);

        await Task.WhenAll(t1, t2);

        var r1 = t1.Result;
        var r2 = t2.Result;

        // exactly one should be success (200) and the other non-success (conflict or badrequest)
        var successCount = (r1.IsSuccessStatusCode ? 1 : 0) + (r2.IsSuccessStatusCode ? 1 : 0);
        successCount.Should().Be(1);

        // product saldo should be 0
        var prods = await http.GetFromJsonAsync<System.Text.Json.JsonElement[]>($"{EstoqueUrl}/api/estoque/produto");
        int finalSaldo = -1;
        foreach (var p in prods)
        {
            if (p.GetProperty("id").GetInt32() == produtoId)
            {
                finalSaldo = p.GetProperty("saldo").GetInt32();
                break;
            }
        }

        finalSaldo.Should().Be(0);
    }
}