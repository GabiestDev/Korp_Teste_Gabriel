-- Initialize required databases for the application
CREATE DATABASE IF NOT EXISTS "EstoqueDB";
CREATE DATABASE IF NOT EXISTS "FaturamentoDB";
-- Note: Some Postgres versions don't support IF NOT EXISTS for CREATE DATABASE; it's harmless if database already exists.
-- EF Core will create tables when the services start.
