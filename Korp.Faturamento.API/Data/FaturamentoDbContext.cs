using Korp.Faturamento.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Korp.Faturamento.API.Data
{
    public class FaturamentoDbContext : DbContext
    {
        public FaturamentoDbContext(DbContextOptions<FaturamentoDbContext> options) : base(options)
        {
        }

        public DbSet<Produto> Produtos { get; set; }
        public DbSet<NotaFiscal> NotasFiscais { get; set; }
        public DbSet<NotaFiscalItem> NotaFiscalItens { get; set; }
        public DbSet<IdempotencyEntry> IdempotencyEntries { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<NotaFiscal>()
                .Property(n => n.NumeroSequencial)
                .ValueGeneratedOnAdd();

            modelBuilder.Entity<NotaFiscal>()
                .HasMany(n => n.Itens)
                .WithOne(i => i.NotaFiscal)
                .HasForeignKey(i => i.NotaFiscalId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<IdempotencyEntry>()
                .HasIndex(e => new { e.Key, e.Route })
                .IsUnique();
        }
    }
}