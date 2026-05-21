-- Migration 004: Add avatar field to users table
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT NULL;

-- Up Migration
ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT NULL;

-- Down Migration (Rollback)
ALTER TABLE users DROP COLUMN avatar;

