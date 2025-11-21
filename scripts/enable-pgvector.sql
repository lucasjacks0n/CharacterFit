-- Enable pgvector extension for PostgreSQL
-- Run this script once to enable vector similarity search

CREATE EXTENSION IF NOT EXISTS vector;

-- Verify the extension is installed
SELECT * FROM pg_extension WHERE extname = 'vector';
