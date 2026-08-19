using Korp.Faturamento.API.Data;
using Asp.Versioning;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Polly;
using Polly.Extensions.Http;
using Serilog;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, services, configuration) =>
{
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .Enrich.FromLogContext()
        .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}");
});

builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
});

builder.Services.AddControllers(options =>
{
    options.Filters.Add<Korp.Faturamento.API.Data.ApiValidationFilter>();
});
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((OpenApiDocument document, OpenApiDocumentTransformerContext context, CancellationToken cancellationToken) =>
    {
        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
        document.Components.SecuritySchemes["bearer"] = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            In = ParameterLocation.Header,
            Name = "Authorization",
            Description = "Token JWT obtido em POST /api/auth/login do Estoque (cole apenas o token)."
        };

        document.Security ??= new List<OpenApiSecurityRequirement>();
        document.Security.Add(new OpenApiSecurityRequirement
        {
            { new OpenApiSecuritySchemeReference("bearer", document, null), new List<string>() }
        });
        return Task.CompletedTask;
    });
});

builder.Services.AddValidatorsFromAssemblyContaining<Korp.Faturamento.API.DTOs.CriarNotaFiscalDto>();
builder.Services.AddFluentValidationAutoValidation();

var jwtKey = builder.Configuration.GetValue<string>("Jwt:Key")
    ?? "korp-dev-secret-chave-segura-para-assinatura-jwt-2026";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration.GetValue<string>("Jwt:Issuer") ?? "Korp",
            ValidAudience = builder.Configuration.GetValue<string>("Jwt:Audience") ?? "Korp-Angular",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();

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
    DatabaseBootstrap.EnsureMigrated(db, app.Logger);
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
app.UseRequestId();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
