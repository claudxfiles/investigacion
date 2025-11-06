# 🔧 Instrucciones para Aplicar Migración RAG

## Problema Identificado

El sistema RAG estaba creando embeddings correctamente (38 chunks), pero la función `match_documents()` retornaba 0 resultados debido a un problema con las políticas RLS (Row Level Security).

### Causa Raíz

La función RPC `match_documents` no tenía `SECURITY DEFINER`, lo que causaba que:
1. La función se ejecutara con los permisos del usuario que la llamaba
2. Las políticas RLS de la tabla `document_embeddings` bloqueaban los resultados
3. El contexto de autenticación no se propagaba correctamente dentro de la función

## Solución

Hemos creado una migración que actualiza la función `match_documents` para:
1. ✅ Usar `SECURITY DEFINER` - ejecuta con permisos elevados
2. ✅ Mantener seguridad - verifica acceso a proyectos del usuario
3. ✅ Retornar resultados correctos - bypassa RLS de tabla pero aplica filtro manual

## Cómo Aplicar la Migración

### Opción 1: SQL Editor en Supabase Dashboard (Recomendado)

1. Abre tu proyecto en Supabase Dashboard: https://app.supabase.com
2. Ve a la sección **SQL Editor**
3. Crea una nueva query
4. Copia y pega el contenido del archivo:
   ```
   supabase/migrations/20250106_fix_match_documents_rls.sql
   ```
5. Haz clic en **Run** para ejecutar la migración

### Opción 2: Supabase CLI (Si tienes acceso local)

```bash
# Asegúrate de estar en el directorio del proyecto
cd /home/user/webapp

# Aplica la migración específica
supabase db push

# O si usas un proyecto enlazado
supabase db push --db-url "tu_database_url"
```

### Opción 3: Ejecutar SQL Directamente

Si prefieres copiar el SQL directamente, aquí está el contenido:

```sql
-- Drop the existing function
DROP FUNCTION IF EXISTS match_documents(vector(1536), float, int, uuid);

-- Recreate with SECURITY DEFINER
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
SECURITY DEFINER
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
    (filter_project_id IS NULL OR de.project_id = filter_project_id)
    AND (1 - (de.embedding <=> query_embedding)) > match_threshold
    AND de.project_id IN (
      SELECT p.id FROM projects p WHERE p.created_by = auth.uid()
    )
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION match_documents(vector(1536), float, int, uuid) TO authenticated;
```

## Verificación

Después de aplicar la migración:

1. **Recarga la aplicación** en tu navegador
2. **Genera un nuevo reporte** para un proyecto con documentos
3. **Revisa los logs** en la consola del navegador:
   - Deberías ver: `✅ [RAG] ENCONTRÓ X chunks relevantes`
   - En lugar de: `⚠️ [RAG] NO encontró contexto relevante`

### Logs Esperados (Éxito)

```
🔍 [RAG] Buscando contexto relevante para reporte executive...
📦 Total embeddings en proyecto: 38
✅ Embedding generado: 1536 dimensiones
📊 RPC retornó: 15 matches
✅ Encontrados 15 chunks relevantes!
📊 [AI Service] RAG chunks encontrados: 15
✅ [AI Service] USANDO RAG como fuente principal (15 chunks)
```

## Cambios Adicionales Implementados

Además de la migración, se agregaron mejoras de logging:

### `lib/rag-service.ts`
- ✅ Logging detallado en `searchSimilar()`
- ✅ Verificación de embeddings antes de buscar
- ✅ Query de diagnóstico si no hay resultados
- ✅ Información sobre similitud de matches

### `lib/ai-service.ts`
- ✅ Logging mejorado del flujo RAG
- ✅ Threshold reducido a 0.5 (más permisivo)
- ✅ Prompts más estrictos contra datos mock
- ✅ Instrucciones profesionales más claras

## Próximos Pasos

1. ✅ **Aplicar migración** (sigue instrucciones arriba)
2. 🔄 **Probar generación de reportes** con documentos existentes
3. 📊 **Verificar que reportes usen contenido real** (no mock)
4. 🎯 **Ajustar threshold** si es necesario (actualmente 0.5)

## Rollback (Si es Necesario)

Si necesitas revertir los cambios:

```sql
-- Restaurar función original
DROP FUNCTION IF EXISTS match_documents(vector(1536), float, int, uuid);

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
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_embeddings.id,
    document_embeddings.document_id,
    document_embeddings.chunk_text,
    document_embeddings.chunk_index,
    1 - (document_embeddings.embedding <=> query_embedding) as similarity,
    document_embeddings.metadata
  FROM document_embeddings
  WHERE 
    (filter_project_id IS NULL OR document_embeddings.project_id = filter_project_id)
    AND 1 - (document_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY document_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

## Soporte

Si después de aplicar la migración sigues teniendo problemas:

1. Verifica que el usuario tenga embeddings: `SELECT count(*) FROM document_embeddings WHERE project_id = 'tu_project_id';`
2. Verifica RLS policies: `SELECT * FROM document_embeddings WHERE project_id = 'tu_project_id' LIMIT 1;`
3. Revisa logs de Supabase en Dashboard > Logs
4. Comparte los logs de la consola del navegador

---

**Fecha de migración:** 2025-01-06  
**Versión:** 1.0  
**Impacto:** Alto - Corrige funcionalidad crítica de RAG
