-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create document_embeddings table for RAG (Retrieval Augmented Generation)
CREATE TABLE IF NOT EXISTS document_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL, -- Chunk of text from the document
  content_index integer DEFAULT 0, -- Index of this chunk in the document
  embedding vector(1536), -- OpenAI embedding vector (1536 dimensions for text-embedding-3-small)
  metadata jsonb DEFAULT '{}', -- Additional metadata (page number, section, etc.)
  created_at timestamptz DEFAULT now()
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS document_embeddings_embedding_idx 
  ON document_embeddings 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Create index for document_id lookups
CREATE INDEX IF NOT EXISTS document_embeddings_document_id_idx 
  ON document_embeddings(document_id);

-- Enable RLS
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_embeddings
CREATE POLICY "Users can view embeddings for own documents"
  ON document_embeddings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents
      JOIN projects ON projects.id = documents.project_id
      WHERE documents.id = document_embeddings.document_id
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert embeddings for own documents"
  ON document_embeddings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      JOIN projects ON projects.id = documents.project_id
      WHERE documents.id = document_embeddings.document_id
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete embeddings for own documents"
  ON document_embeddings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents
      JOIN projects ON projects.id = documents.project_id
      WHERE documents.id = document_embeddings.document_id
      AND projects.created_by = auth.uid()
    )
  );

-- Function to search similar documents using cosine similarity
CREATE OR REPLACE FUNCTION match_document_embeddings(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_document_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  content_index integer,
  similarity float,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_embeddings.id,
    document_embeddings.document_id,
    document_embeddings.content,
    document_embeddings.content_index,
    1 - (document_embeddings.embedding <=> query_embedding) AS similarity,
    document_embeddings.metadata
  FROM document_embeddings
  WHERE 
    (filter_document_ids IS NULL OR document_embeddings.document_id = ANY(filter_document_ids))
    AND (1 - (document_embeddings.embedding <=> query_embedding)) >= match_threshold
  ORDER BY document_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

