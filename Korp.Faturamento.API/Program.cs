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

builder.Services.AddHttpClient("EstoqueClient", client =>
{
    client.BaseAddress = new Uri("http://localhost:5164");
})
.AddPolicyHandler(GetRetryPolicy())
.AddPolicyHandler(GetCircuitBreakerPolicy());


var app = builder.Build();

try
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<FaturamentoDbContext>();
    db.Database.EnsureCreated();
}
catch (Exception ex)
{
    app.Logger.LogError(ex, "Não foi possível conectar ao PostgreSQL do Faturamento. O serviço continuará em modo degradado.");
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapGet("/health", () => Results.Ok(new
{
    service = "Faturamento",
    status = "degraded",
    message = "Banco PostgreSQL indisponível. O serviço continua em modo degradado e os endpoints podem responder com erro apropriado."
}));

app.UseCors("AllowAngular");
app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
app.Run();
