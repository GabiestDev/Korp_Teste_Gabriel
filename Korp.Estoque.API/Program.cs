using Korp.Estoque.API.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var estoqueConnectionString = builder.Configuration.GetConnectionString("EstoqueDb")
    ?? "Host=localhost;Port=5432;Database=EstoqueDB;Username=postgres;Password=postgres";

builder.Services.AddDbContext<EstoqueDbContext>(options =>
    options.UseNpgsql(estoqueConnectionString));

var app = builder.Build();

try
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<EstoqueDbContext>();
    db.Database.EnsureCreated();
}
catch (Exception ex)
{
    app.Logger.LogError(ex, "Não foi possível conectar ao PostgreSQL do Estoque. O serviço continuará em modo degradado.");
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapGet("/health", () => Results.Ok(new
{
    service = "Estoque",
    status = "degraded",
    message = "Banco PostgreSQL indisponível. O serviço continua em modo degradado e os endpoints podem responder com erro apropriado."
}));

app.UseCors("AllowAngular");
app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
app.Run();
