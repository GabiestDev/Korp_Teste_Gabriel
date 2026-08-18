using Korp.Faturamento.API.Data;
using Microsoft.EntityFrameworkCore;
using Polly;
using Polly.Extensions.Http;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

var faturamentoConnectionString = builder.Configuration.GetConnectionString("FaturamentoDb")
    ?? "Host=localhost;Port=5432;Database=FaturamentoDB;Username=postgres;Password=postgres";

builder.Services.AddDbContext<FaturamentoDbContext>(options =>
    options.UseNpgsql(faturamentoConnectionString));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.WithOrigins("http://localhost:4200") 
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

static IAsyncPolicy<HttpResponseMessage> GetRetryPolicy()
{
    return HttpPolicyExtensions
        .HandleTransientHttpError()
        .WaitAndRetryAsync(3, retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)));
}

static IAsyncPolicy<HttpResponseMessage> GetCircuitBreakerPolicy()
{
    return HttpPolicyExtensions
        .HandleTransientHttpError()
        .CircuitBreakerAsync(5, TimeSpan.FromSeconds(30));
}

var estoqueBase = builder.Configuration.GetValue<string>("EstoqueService:BaseUrl") ?? "http://localhost:5090";
builder.Services.AddHttpClient("EstoqueClient", client =>
{
    client.BaseAddress = new Uri(estoqueBase);
})
.AddPolicyHandler(GetRetryPolicy())
.AddPolicyHandler(GetCircuitBreakerPolicy());


var app = builder.Build();

try
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<FaturamentoDbContext>();
    try
    {
        db.Database.Migrate();
    }
    catch (Exception migrateEx)
    {
        // Legacy database created with EnsureCreated has no migration history.
        // Fall back to ensuring the schema exists so the service keeps working.
        app.Logger.LogWarning(migrateEx, "Não foi possível aplicar migrations; verificando schema existente.");
        db.Database.EnsureCreated();
    }
}
catch (Exception ex)
{
    app.Logger.LogError(ex, "Não foi possível conectar ao PostgreSQL do Faturamento. O serviço continuará em modo degradado.");
}

app.MapOpenApi();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/openapi/v1.json", "Korp Faturamento v1");
});

app.MapGet("/health", async () =>
{
    try
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FaturamentoDbContext>();
        await db.Database.CanConnectAsync();
        return Results.Ok(new
        {
            service = "Faturamento",
            status = "ok",
            message = "Serviço saudável."
        });
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Health check do Faturamento detectou indisponibilidade do banco.");
        return Results.Ok(new
        {
            service = "Faturamento",
            status = "degraded",
            message = "Banco PostgreSQL indisponível. O serviço continua em modo degradado e os endpoints podem responder com erro apropriado."
        });
    }
});

app.UseCors("AllowAngular");
app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
app.Run();
