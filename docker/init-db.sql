-- ==============================================================
-- AgentIQ PostgreSQL + pgvector Initialization Script
-- Executed on container startup
-- ==============================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create the dedicated restricted read-only role for SQL Analytics
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles WHERE rolname = 'analytics_reader'
   ) THEN
      CREATE ROLE analytics_reader WITH LOGIN PASSWORD 'readonly_password';
   END IF;
END
$do$;

-- Revoke default privileges from analytics_reader
REVOKE ALL ON SCHEMA public FROM analytics_reader;
GRANT CONNECT ON DATABASE agentiq_db TO analytics_reader;
GRANT USAGE ON SCHEMA public TO analytics_reader;

-- Grant SELECT only on the approved sample business tables (created during migrations/seed)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO analytics_reader;
