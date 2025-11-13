-- Add pgvector extension and embeddings column
-- Migration: 20250113000000_add_pgvector

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embeddings column to items table
-- Using vector(1536) for OpenAI text-embedding-3-small/large
-- Adjust dimensions based on your embedding provider
ALTER TABLE items
ADD COLUMN IF NOT EXISTS embeddings vector(1536);

-- Create index for cosine similarity search (most common for embeddings)
-- Using ivfflat index for approximate nearest neighbor search
-- lists=100 is a good default for datasets < 1M rows
CREATE INDEX IF NOT EXISTS items_embeddings_idx
ON items
USING ivfflat (embeddings vector_cosine_ops)
WITH (lists = 100);

-- Optional: Create index for L2 distance (Euclidean)
-- CREATE INDEX items_embeddings_l2_idx
-- ON items
-- USING ivfflat (embeddings vector_l2_ops)
-- WITH (lists = 100);

-- Optional: Create index for inner product (dot product)
-- CREATE INDEX items_embeddings_ip_idx
-- ON items
-- USING ivfflat (embeddings vector_ip_ops)
-- WITH (lists = 100);

-- Add index on domain for filtered searches
CREATE INDEX IF NOT EXISTS items_domain_idx ON items(domain);

-- Create a helper function for similarity search
CREATE OR REPLACE FUNCTION search_similar_items(
  query_embedding vector(1536),
  match_domain text DEFAULT NULL,
  match_limit int DEFAULT 10
)
RETURNS TABLE (
  id text,
  title text,
  domain text,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.title,
    i.domain,
    1 - (i.embeddings <=> query_embedding) AS similarity
  FROM items i
  WHERE
    i.embeddings IS NOT NULL
    AND (match_domain IS NULL OR i.domain = match_domain)
  ORDER BY i.embeddings <=> query_embedding
  LIMIT match_limit;
END;
$$ LANGUAGE plpgsql;
