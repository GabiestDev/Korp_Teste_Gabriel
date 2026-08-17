using Korp.Estoque.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Korp.Estoque.API.Data
{
    public class EstoqueDbContext : DbContext
    {
        public EstoqueDbContext(DbContextOptions<EstoqueDbContext> options) : base(options)
        {
        }

        public DbSet<Produto> Produtos { get; set; }
        public DbSet<IdempotencyEntry> IdempotencyEntries { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Produto>()
                .Property(p => p.Id)
                .ValueGeneratedOnAdd();

            modelBuilder.Entity<IdempotencyEntry>()
                .HasIndex(e => new { e.Key, e.Route })
                .IsUnique();
        }
    }
}