# 🚀 Configuración del Sistema RAG

## Paso 1: Ejecutar la Migración en Supabase

1. **Accede al Dashboard de Supabase**
   - URL: https://app.supabase.com
   - Selecciona tu proyecto

2. **Ve al SQL Editor**
   - En el menú lateral, haz clic en "SQL Editor"

3. **Ejecuta el script de migración**
   - Copia y pega el contenido del archivo `supabase/migrations/20250105_enable_pgvector.sql`
   - Haz clic en "Run" para ejecutar el script

4. **Verifica la instalación**
   ```sql
   -- Verificar que pgvector está instalado
   SELECT * FROM pg_extension WHERE extname = 'vector';
   
   -- Verificar que la tabla existe
   SELECT * FROM information_schema.tables WHERE table_name = 'document_embeddings';
   
   -- Verificar que la función existe
   SELECT routine_name FROM information_schema.routines WHERE routine_name = 'match_documents';
   ```

## Paso 2: Configurar Variables de Entorno

Asegúrate de que tu archivo `.env.local` tenga las siguientes variables:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
NEXT_PUBLIC_OPENAI_API_KEY=tu_openai_api_key
```

## Características del Sistema RAG

### 🔍 Búsqueda Semántica
- Encuentra información relevante en documentos usando similitud vectorial
- No depende de palabras exactas, entiende el contexto y significado
- Resultados ordenados por relevancia

### 📊 Chunking Inteligente
- Divide documentos grandes en fragmentos de 1000 tokens
- Mantiene contexto con overlap de 200 tokens
- Preserva estructura y coherencia del texto

### 🧠 Embeddings con OpenAI
- Usa modelo text-embedding-3-small (1536 dimensiones)
- Alta precisión y eficiencia
- Compatible con múltiples idiomas (incluyendo español)

### 📝 Soporte Multi-formato
- **PDFs**: Extracción de texto completo
- **Word**: Procesamiento de documentos .doc y .docx
- **Excel**: Análisis de datos tabulares con contexto
- **Imágenes**: OCR para extraer texto de imágenes
- **CSV**: Procesamiento de datos estructurados

### ⚡ Rendimiento Optimizado
- Índice IVFFlat para búsquedas rápidas
- Cache de embeddings para evitar recálculos
- Queries optimizadas con threshold configurable

## Funciones Principales

### 1. Procesamiento de Documentos
Cuando subes un documento:
1. Se extrae el texto/datos del archivo
2. Se divide en chunks manejables
3. Se generan embeddings para cada chunk
4. Se almacenan en la base de datos vectorial

### 2. Búsqueda Semántica
Para buscar información:
```typescript
const results = await ragService.searchSimilar(
  "¿Cuáles son los riesgos financieros?",
  projectId,
  5 // número de resultados
);
```

### 3. Generación de Reportes Mejorada
Los reportes ahora usan RAG para:
- Encontrar información relevante automáticamente
- Incluir contexto preciso de los documentos
- Mejorar la calidad de hallazgos y recomendaciones

## Troubleshooting

### Error: "extension vector does not exist"
- Ejecuta el script de migración en Supabase SQL Editor
- Asegúrate de tener permisos de administrador

### Error: "function match_documents does not exist"
- Verifica que el script se ejecutó completamente
- Revisa los logs de Supabase para errores

### Embeddings no se generan
- Verifica que NEXT_PUBLIC_OPENAI_API_KEY esté configurada correctamente
- Revisa los límites de tu API key de OpenAI
- Comprueba la consola del navegador para errores

### Búsquedas no devuelven resultados
- Ajusta el match_threshold (por defecto 0.78)
- Verifica que los documentos se hayan procesado correctamente
- Asegúrate de que el project_id sea correcto

## Mejoras Futuras
- [ ] Soporte para búsqueda híbrida (vectorial + keyword)
- [ ] Caché de queries frecuentes
- [ ] Reranking de resultados con modelos adicionales
- [ ] Análisis de imágenes con GPT-4 Vision
- [ ] Procesamiento de documentos en background
- [ ] Compresión de contexto para documentos muy largos
