# Configuración RAG (Retrieval Augmented Generation)

Este proyecto ahora incluye un sistema RAG completo para mejorar el análisis de documentos mediante búsqueda semántica.

## 🚀 Características Implementadas

1. **Extracción Automática de Texto**: Los PDFs se procesan automáticamente usando pdfjs-dist
2. **Generación de Embeddings**: Se crean embeddings usando OpenAI (text-embedding-3-small)
3. **Búsqueda Semántica**: Búsqueda vectorial usando pgvector en Supabase
4. **Integración con IA**: Los informes ahora usan RAG para obtener contexto relevante

## 📋 Pasos de Configuración

### 1. Aplicar Migración en Supabase

Ejecuta la migración SQL en tu base de datos de Supabase:

```bash
# Opción 1: Desde el Dashboard de Supabase
# Ve a SQL Editor y ejecuta el contenido de:
supabase/migrations/20251104000000_add_vector_embeddings.sql

# Opción 2: Si usas Supabase CLI
supabase db push
```

La migración creará:
- Tabla `document_embeddings` con soporte para vectores
- Extensión `pgvector` habilitada
- Función `match_document_embeddings` para búsqueda semántica
- Índices optimizados para búsqueda vectorial

### 2. Variables de Entorno

Asegúrate de tener configurada tu API key de OpenAI:

```env
NEXT_PUBLIC_OPENAI_API_KEY=tu_api_key_aqui
```

### 3. Verificar Funcionamiento

1. **Sube un documento PDF**: Al subir un PDF, se procesará automáticamente:
   - Se extrae el texto del PDF
   - Se divide en chunks de ~1000 caracteres
   - Se generan embeddings para cada chunk
   - Se almacenan en Supabase

2. **Genera un informe**: Al generar un informe con IA:
   - Se usa RAG para buscar contexto relevante
   - Se enriquece el prompt con información semántica
   - Los informes son más precisos y basados en el contenido real

## 🔧 Cómo Funciona

### Flujo de Procesamiento de Documentos

```
1. Usuario sube PDF
   ↓
2. DocumentUpload.tsx llama a RAGService.processDocumentForRAG()
   ↓
3. DocumentProcessor.extractTextFromPDF() extrae texto usando pdfjs
   ↓
4. DocumentProcessor.chunkText() divide en chunks
   ↓
5. EmbeddingsService.generateEmbeddings() crea embeddings con OpenAI
   ↓
6. Se almacenan en document_embeddings (Supabase)
   ↓
7. Documento marcado como "completed"
```

### Flujo de Generación de Informes con RAG

```
1. Usuario genera informe
   ↓
2. AIService.generateReport() llama a RAGService.getRelevantContext()
   ↓
3. RAGService.searchSimilarDocuments() busca chunks similares
   ↓
4. Se obtiene contexto relevante usando búsqueda semántica
   ↓
5. Se enriquece el prompt con contexto RAG
   ↓
6. OpenAI genera informe más preciso
```

## 📊 Estructura de Datos

### Tabla `document_embeddings`

```sql
- id: uuid (PK)
- document_id: uuid (FK → documents)
- content: text (chunk de texto)
- content_index: integer (índice del chunk)
- embedding: vector(1536) (embedding de OpenAI)
- metadata: jsonb (metadata adicional)
- created_at: timestamptz
```

## 🛠️ Servicios Disponibles

### RAGService

- `processDocumentForRAG()`: Procesa un documento completo (extrae texto, crea embeddings)
- `searchSimilarDocuments()`: Busca documentos similares usando búsqueda semántica
- `getRelevantContext()`: Obtiene contexto relevante para una query
- `deleteDocumentEmbeddings()`: Elimina embeddings de un documento

### DocumentProcessor

- `extractTextFromPDF()`: Extrae texto de PDFs usando pdfjs-dist
- `extractTextFromImage()`: Extrae texto de imágenes usando OpenAI Vision
- `chunkText()`: Divide texto en chunks para embeddings

### EmbeddingsService

- `generateEmbedding()`: Genera un embedding para un texto
- `generateEmbeddings()`: Genera embeddings en batch

## 🔍 Búsqueda Semántica

La función `match_document_embeddings` en Supabase permite:

- **Búsqueda por similitud**: Usa distancia coseno para encontrar chunks similares
- **Filtrado**: Puedes filtrar por `document_ids` específicos
- **Threshold**: Configura el umbral de similitud (0.0 - 1.0)
- **Límite**: Controla cuántos resultados devolver

Ejemplo de uso:

```typescript
const results = await RAGService.searchSimilarDocuments(
  'buscar información sobre X',
  ['document-id-1', 'document-id-2'],
  10,  // límite
  0.7  // threshold de similitud
);
```

## ⚠️ Notas Importantes

1. **Costo de OpenAI**: Cada documento procesado genera múltiples llamadas a OpenAI (una por cada chunk). Para documentos grandes, esto puede ser costoso.

2. **Tiempo de Procesamiento**: El procesamiento puede tardar varios segundos o minutos dependiendo del tamaño del documento.

3. **Límites de OpenAI**: 
   - Máximo 8000 caracteres por embedding
   - Rate limits aplican según tu plan

4. **Fallbacks**: Si falla el procesamiento RAG, el sistema usa el contenido extraído directamente o la descripción del documento.

## 🐛 Troubleshooting

### Error: "pgvector extension not found"
- Asegúrate de haber ejecutado la migración SQL
- Verifica que la extensión esté habilitada: `SELECT * FROM pg_extension WHERE extname = 'vector';`

### Error: "OpenAI API key no configurada"
- Verifica que `NEXT_PUBLIC_OPENAI_API_KEY` esté en tu `.env.local`
- Reinicia el servidor de desarrollo después de agregar la variable

### Documentos no se procesan
- Verifica la consola del navegador para errores
- Revisa que el documento tenga texto extraíble (no sea solo imagen escaneada)
- Para imágenes, necesitas OpenAI Vision API habilitada

## 📝 Próximas Mejoras

- [ ] Soporte para documentos Word (.docx) usando mammoth
- [ ] Procesamiento asíncrono en background jobs
- [ ] Cache de embeddings para evitar regeneración
- [ ] Re-rank de resultados RAG usando modelos más avanzados
- [ ] Interfaz para ver y gestionar embeddings

