-- Fix match_documents RPC function to work correctly with RLS policies
-- 
-- PROBLEM: The original function doesn't bypass RLS, so when called from the client,
-- it returns 0 results even though embeddings exist in the database.
-- 
-- SOLUTION: Add SECURITY DEFINER to execute with elevated privileges and properly
-- filter results based on the user's accessible projects.

-- Drop the existing function
DROP FUNCTION IF EXISTS match_documents(vector(1536), float, int, uuid);

-- Recreate with SECURITY DEFINER and improved filtering
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.78,
  match_count int DEFAULT 10,
  filter_project_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  chunk_text text,
  chunk_index int,
  similarity float,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER -- Execute with the permissions of the function owner, not the caller
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.id,
    de.document_id,
    de.chunk_text,
    de.chunk_index,
    (1 - (de.embedding <=> query_embedding)) as similarity,
    de.metadata
  FROM document_embeddings de
  WHERE 
    -- Filter by project if specified
    (filter_project_id IS NULL OR de.project_id = filter_project_id)
    -- Only return results above similarity threshold
    AND (1 - (de.embedding <=> query_embedding)) > match_threshold
    -- Ensure user has access to the project (RLS-aware check)
    AND de.project_id IN (
      SELECT p.id FROM projects p WHERE p.created_by = auth.uid()
    )
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION match_documents(vector(1536), float, int, uuid) TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION match_documents IS 'Performs vector similarity search on document embeddings with RLS-aware filtering. Uses SECURITY DEFINER to bypass table-level RLS while still enforcing project-level access control.';
