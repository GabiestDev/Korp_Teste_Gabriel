using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;

namespace Korp.Estoque.API.Data
{
    /// <summary>
    /// Aplica migrations de forma robusta, lidando com bancos "legados" que foram
    /// criados via EnsureCreated (tabelas existem, mas sem histórico de migrations).
    /// </summary>
    public static class DatabaseBootstrap
    {
        public static void EnsureMigrated(DbContext db, ILogger logger)
        {
            var allMigrations = db.Database.GetMigrations().ToList();
            if (allMigrations.Count == 0) return;

            var pending = db.Database.GetPendingMigrations().ToList();
            if (pending.Count == 0) return;

            try
            {
                db.Database.Migrate();
                return;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Não foi possível aplicar migrations via histórico; tentando sincronizar schema legado.");
            }

            // Bancos criados com EnsureCreated não possuem histórico de migrations.
            // Nesse caso, registra todas as migrations atuais como aplicadas (o schema
            // correspondente já existe) e reaplica o Migrate para qualquer pendência.
            var applied = db.Database.GetAppliedMigrations().ToHashSet();
            if (applied.Count != 0) return;

            var connection = db.Database.GetDbConnection();
            var transaction = db.Database.BeginTransaction();
            try
            {
                foreach (var migration in allMigrations)
                {
                    if (applied.Contains(migration)) continue;

                    using var cmd = connection.CreateCommand();
                    cmd.Transaction = transaction.GetDbTransaction();
                    cmd.CommandText =
                        "INSERT INTO \"__EFMigrationsHistory\" (\"MigrationId\", \"ProductVersion\") VALUES (@id, @version)";
                    cmd.Parameters.Add(new Npgsql.NpgsqlParameter("@id", migration));
                    cmd.Parameters.Add(new Npgsql.NpgsqlParameter("@version", "10.0.11"));
                    cmd.ExecuteNonQuery();
                }

                transaction.Commit();
            }
            catch
            {
                transaction.Rollback();
                throw;
            }

            db.Database.Migrate();
        }
    }
}