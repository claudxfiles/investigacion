# 🧠 Sistema RAG (Retrieval-Augmented Generation)

## ✨ Visión General

Este sistema implementa RAG (Retrieval-Augmented Generation) completo para análisis inteligente de documentos. Combina búsqueda vectorial semántica con generación de texto usando IA para proporcionar análisis profundos y contextualizados de cualquier tipo de documento.

## 🎯 Características Principales

### 1. 📄 Procesamiento Multi-Formato
- **PDF**: Extracción completa de texto con metadatos
- **Word (.doc, .docx)**: Procesamiento con Mammoth
- **Excel (.xlsx, .xls)**: Análisis de datos tabulares con estadísticas
- **CSV**: Procesamiento de datos estructurados con detección automática de delimitadores
- **Imágenes (JPG, PNG)**: OCR con Tesseract.js (español + inglés)

### 2. 🔍 Búsqueda Semántica
- Búsqueda vectorial usando embeddings de OpenAI (text-embedding-3-small)
- Resultados ordenados por relevancia con scores de similitud
- Destacado de términos relevantes en resultados
- Contexto expandible para ver fragmentos completos

### 3. 🤖 Generación de Reportes Mejorada con RAG
- Búsqueda automática de contexto relevante antes de generar reportes
- Análisis más preciso usando fragmentos específicos de documentos
- Referencias automáticas a documentos fuente
- Hallazgos basados en evidencia concreta

### 4. 📊 Chunking Inteligente
- División automática de documentos en fragmentos de 1000 tokens
- Overlap de 200 tokens para mantener contexto
- Respeto de límites de párrafos y oraciones
- Preservación de coherencia textual

### 5. ⚡ Vectorización con pgvector
- Base de datos vectorial en Supabase
- Índice IVFFlat para búsquedas rápidas
- Embeddings de 1536 dimensiones
- Búsqueda por similitud coseno

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIO / UI                              │
├─────────────────────────────────────────────────────────────┤
│  • DocumentUpload (Subir y procesar)                        │
│  • SemanticSearch (Buscar con IA)                           │
│  • ReportGenerator (Generar reportes)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│                 CAPA DE SERVICIOS                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ DocumentProcessor                                     │  │
│  │ • extractTextFromPDF()                               │  │
│  │ • extractTextFromImage() (OCR)                       │  │
│  │ • extractTextFromWord()                              │  │
│  │ • extractDataFromExcel()                             │  │
│  │ • extractDataFromCSV()                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│  ┌──────────────────────┴───────────────────────────────┐  │
│  │ EmbeddingService                                      │  │
│  │ • generateEmbedding() - OpenAI API                   │  │
│  │ • generateEmbeddings() - Batch                       │  │
│  │ • chunkText() - División inteligente                 │  │
│  │ • cosineSimilarity() - Cálculo de similitud          │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│  ┌──────────────────────┴───────────────────────────────┐  │
│  │ RAGService                                            │  │
│  │ • processDocument() - Generar embeddings             │  │
│  │ • searchSimilar() - Búsqueda vectorial               │  │
│  │ • buildContext() - Consolidar resultados             │  │
│  │ • reindexDocument() - Re-vectorizar                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│  ┌──────────────────────┴───────────────────────────────┐  │
│  │ AIService                                             │  │
│  │ • generateReport() - Con contexto RAG                │  │
│  │ • getUserPrompt() - Incluye fragmentos relevantes    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└────────────────────┬─────────────────────────────────────────┘
                     │
┌────────────────────┴─────────────────────────────────────────┐
│                 SUPABASE BACKEND                              │
├──────────────────────────────────────────────────────────────┤
│  • Storage: Almacenamiento de archivos originales           │
│  • documents: Tabla de documentos con texto extraído         │
│  • document_embeddings: Vectores con pgvector                │
│  • match_documents(): Función RPC de búsqueda vectorial      │
│  • projects: Proyectos de análisis                           │
│  • reports: Informes generados                               │
└──────────────────────────────────────────────────────────────┘
```

## 📦 Estructura de Archivos

```
lib/
├── document-processor.ts    # Procesamiento multi-formato
├── embedding-service.ts     # Generación de embeddings
├── rag-service.ts          # Búsqueda y vectorización
├── ai-service.ts           # Generación de reportes mejorada
├── supabase.ts             # Cliente de Supabase
└── templates.ts            # Plantillas de reportes

components/
├── DocumentUpload.tsx      # Subida con procesamiento automático
├── SemanticSearch.tsx      # Interfaz de búsqueda IA
├── ReportGenerator.tsx     # Generador con RAG integrado
└── ProjectDashboard.tsx    # Dashboard con búsqueda IA

supabase/
├── migrations/
│   └── 20250105_enable_pgvector.sql   # Setup de pgvector
└── SETUP_RAG.md                       # Instrucciones de setup

types/
└── index.ts                # Tipos TypeScript extendidos
```

## 🚀 Flujo de Trabajo

### 1️⃣ Subida y Procesamiento de Documentos

```typescript
Usuario sube documento
    ↓
DocumentUpload.tsx
    ↓
DocumentProcessor.processDocument()
    ↓ (extrae texto según tipo)
    ├─ PDF → extractTextFromPDF() → pdf-parse
    ├─ Imagen → extractTextFromImage() → Tesseract.js OCR
    ├─ Word → extractTextFromWord() → Mammoth
    ├─ Excel → extractDataFromExcel() → SheetJS
    └─ CSV → extractDataFromCSV() → Parser manual
    ↓
Texto extraído guardado en Supabase
    ↓
RAGService.processDocument()
    ↓
EmbeddingService.chunkText() → Divide en fragmentos
    ↓
EmbeddingService.generateEmbeddings() → OpenAI API
    ↓
Embeddings guardados en document_embeddings (pgvector)
```

### 2️⃣ Búsqueda Semántica

```typescript
Usuario ingresa query
    ↓
SemanticSearch.tsx
    ↓
EmbeddingService.generateEmbedding(query)
    ↓
RAGService.searchSimilar()
    ↓
Supabase RPC: match_documents()
    ↓ (búsqueda vectorial con pgvector)
Resultados ordenados por similitud
    ↓
Construir contexto consolidado
    ↓
Mostrar resultados con highlights
```

### 3️⃣ Generación de Reportes con RAG

```typescript
Usuario solicita reporte
    ↓
ReportGenerator.tsx
    ↓
AIService.generateReport()
    ↓
RAGService.searchSimilar(query basada en tipo de reporte)
    ↓
Obtener top 15 chunks más relevantes
    ↓
Construir prompt con:
    • Contexto RAG (fragmentos relevantes)
    • Documentos tradicionales (fallback)
    • Plantilla específica del tipo de reporte
    ↓
OpenAI GPT-4o-mini genera análisis
    ↓
Reporte con referencias a documentos fuente
```

## 🔧 Configuración Inicial

### 1. Instalar Dependencias

Las dependencias ya están en `package.json`:
```json
{
  "dependencies": {
    "xlsx": "^0.18.5",           // Excel
    "mammoth": "latest",         // Word
    "pdf-parse": "latest",       // PDF
    "tesseract.js": "latest"     // OCR
  }
}
```

### 2. Configurar Supabase

1. Accede a tu dashboard de Supabase
2. Ve al SQL Editor
3. Ejecuta el script: `supabase/migrations/20250105_enable_pgvector.sql`
4. Verifica la instalación:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'vector';
   SELECT * FROM document_embeddings LIMIT 1;
   ```

### 3. Configurar Variables de Entorno

Ya configuradas en `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://gkgswlcsurnzgnjbhlkt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
NEXT_PUBLIC_OPENAI_API_KEY=sk-proj-3u-5KaVX...
```

## 📊 Esquema de Base de Datos

### Tabla: `document_embeddings`

```sql
CREATE TABLE document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,              -- Fragmento de texto
  chunk_index INTEGER NOT NULL,          -- Posición del fragmento
  embedding vector(1536),                -- Vector de OpenAI
  metadata JSONB DEFAULT '{}',           -- Metadatos adicionales
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsqueda vectorial rápida
CREATE INDEX idx_document_embeddings_embedding 
ON document_embeddings USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);
```

### Función: `match_documents`

```sql
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
```

## 🎨 Componentes de UI

### 1. SemanticSearch

Componente de búsqueda semántica con:
- Input de búsqueda con autocompletado
- Resultados ordenados por relevancia
- Highlighting de términos
- Expansión de fragmentos
- Indicador de porcentaje de relevancia

### 2. DocumentUpload (Mejorado)

Ahora incluye:
- Procesamiento automático de todos los formatos
- Generación automática de embeddings
- Indicadores de progreso
- Soporte para batch upload

### 3. ReportGenerator (Mejorado)

Incluye:
- Búsqueda RAG automática antes de generar
- Vista previa con contexto RAG usado
- Referencias específicas a fragmentos
- Mejor calidad de análisis

## 🔍 Ejemplos de Uso

### Buscar en Documentos

```typescript
import { RAGService } from '@/lib/rag-service';
import { EmbeddingService } from '@/lib/embedding-service';

// Inicializar
EmbeddingService.initialize(openaiApiKey);

// Buscar
const results = await RAGService.searchSimilar(
  "¿Cuáles son los principales riesgos financieros?",
  projectId,
  10,  // límite de resultados
  0.78 // threshold de similitud
);

console.log(`Encontrados ${results.chunks.length} fragmentos relevantes`);
results.chunks.forEach(chunk => {
  console.log(`${chunk.document?.filename}: ${chunk.similarity * 100}% relevante`);
  console.log(chunk.chunk_text);
});
```

### Procesar Documento

```typescript
import { DocumentProcessor } from '@/lib/document-processor';
import { RAGService } from '@/lib/rag-service';

// Extraer texto
const extractedText = await DocumentProcessor.processDocument(file, 'pdf');

// Generar embeddings
const result = await RAGService.processDocument(
  documentId,
  projectId,
  extractedText,
  { filename: file.name, fileType: 'pdf' }
);

console.log(`Creados ${result.chunksCreated} chunks`);
```

## 📈 Métricas y Estadísticas

```typescript
import { RAGService } from '@/lib/rag-service';

// Obtener estadísticas del proyecto
const stats = await RAGService.getProjectStats(projectId);

console.log(`Total embeddings: ${stats.totalEmbeddings}`);
console.log(`Documentos vectorizados: ${stats.totalDocuments}`);
console.log(`Promedio chunks/doc: ${stats.averageChunksPerDocument.toFixed(1)}`);
```

## 🐛 Troubleshooting

### Error: "extension vector does not exist"
**Solución**: Ejecuta el script de migración en Supabase SQL Editor

### Búsquedas no devuelven resultados
**Posibles causas**:
1. Threshold muy alto (prueba con 0.70 en vez de 0.78)
2. Documentos no procesados (verifica que tengan embeddings)
3. Query muy específica (usa términos más generales)

### OCR no funciona en imágenes
**Posibles causas**:
1. Imagen de baja calidad
2. Texto muy pequeño
3. Idioma no soportado (agrega más idiomas en createWorker)

### Embeddings no se generan
**Solución**:
1. Verifica API key de OpenAI
2. Chequea límites de rate limit
3. Revisa logs de consola para errores

## 🚀 Mejoras Futuras

- [ ] Soporte para más idiomas en OCR
- [ ] Reranking de resultados con modelos adicionales
- [ ] Caché de embeddings frecuentes
- [ ] Búsqueda híbrida (vectorial + keyword)
- [ ] Análisis de imágenes con GPT-4 Vision
- [ ] Compresión de contexto para documentos largos
- [ ] Generación de resúmenes automáticos
- [ ] Integración con n8n para automatización

## 📚 Referencias

- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [Supabase pgvector](https://supabase.com/docs/guides/ai/vector-columns)
- [Tesseract.js](https://tesseract.projectnaptha.com/)
- [Mammoth.js](https://github.com/mwilliamson/mammoth.js)
- [pdf-parse](https://www.npmjs.com/package/pdf-parse)
- [SheetJS](https://sheetjs.com/)

## 👨‍💻 Soporte

Para preguntas o problemas:
1. Revisa los logs de consola
2. Verifica la configuración de Supabase
3. Comprueba las API keys
4. Consulta la documentación de cada servicio

---

**Implementado con ❤️ usando Next.js, Supabase, OpenAI y pgvector**
