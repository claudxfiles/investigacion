# 🧪 Guía de Prueba del Sistema RAG

## 🌐 URL de la Aplicación

**Accede a la aplicación en:**
```
https://3001-iu6txldrfyzb2plslqzm1-02b9cc79.sandbox.novita.ai
```

---

## ✅ Pre-requisitos

Asegúrate de que en Supabase ya ejecutaste:

```sql
-- Verificar que pgvector esté habilitado
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Debe retornar una fila con: 
-- oid | extname | extowner | extnamespace | extrelocatable | extversion | extconfig | extcondition
-- ... | vector  | ...

-- Verificar que la tabla existe
SELECT * FROM information_schema.tables WHERE table_name = 'document_embeddings';

-- Debe retornar una fila confirmando que la tabla existe
```

Si no están, ejecuta: `supabase/migrations/20250105_enable_pgvector.sql`

---

## 🧪 Plan de Pruebas

### Prueba 1: Subir Documento y Verificar RAG

#### Paso 1: Crear un Proyecto
1. Accede a la aplicación
2. Inicia sesión o regístrate
3. Haz clic en "Nuevo Proyecto"
4. Completa:
   - Nombre: "Prueba RAG Sistema"
   - Tipo: General
   - Descripción: "Proyecto de prueba para validar el sistema RAG"
5. Haz clic en "Crear Proyecto"

#### Paso 2: Subir Documento Excel (Procesamiento Completo)
1. Haz clic en el proyecto creado
2. Haz clic en "Subir Documentos"
3. Sube un archivo Excel (.xlsx o .xls) con datos
4. Añade descripción (opcional)
5. Haz clic en "Subir"

**Qué debe pasar:**
- ✅ El documento se sube exitosamente
- ✅ Se extrae texto automáticamente (ver en lista de documentos)
- ✅ Se generan embeddings automáticamente
- ✅ Los embeddings se guardan en `document_embeddings` de Supabase

**Verificación en Supabase:**
```sql
-- Ver embeddings generados
SELECT 
  id,
  document_id,
  chunk_text,
  chunk_index,
  metadata,
  created_at
FROM document_embeddings
ORDER BY created_at DESC
LIMIT 10;

-- Contar embeddings por proyecto
SELECT 
  project_id,
  COUNT(*) as total_embeddings,
  COUNT(DISTINCT document_id) as total_documents
FROM document_embeddings
GROUP BY project_id;
```

#### Paso 3: Subir Documento CSV
1. Haz clic en "Subir Documentos"
2. Sube un archivo CSV con datos
3. Haz clic en "Subir"

**Qué debe pasar:**
- ✅ CSV se procesa automáticamente
- ✅ Se detecta delimitador automáticamente
- ✅ Se extraen datos tabulares
- ✅ Se generan embeddings para el contenido

#### Paso 4: Subir PDF, Word o Imagen (Metadata Básica)
1. Sube un PDF, Word o imagen
2. Añade una descripción detallada (IMPORTANTE)

**Qué debe pasar:**
- ✅ Se guarda metadata básica del archivo
- ✅ Se usa la descripción como contenido principal
- ✅ Se generan embeddings si la descripción es suficientemente larga (>100 caracteres)

---

### Prueba 2: Búsqueda Semántica (RAG en Acción)

#### Paso 1: Acceder a Búsqueda IA
1. En el dashboard del proyecto
2. Haz clic en la pestaña "🔍 Búsqueda IA"

#### Paso 2: Realizar Búsquedas
Prueba con queries como:

**Para datos Excel:**
```
¿Cuáles son los valores máximos encontrados?
```

**Para CSV:**
```
Dame un resumen de los datos tabulares
```

**General:**
```
¿Qué información importante hay en los documentos?
```

**Qué debe pasar:**
- ✅ La query se convierte en embedding
- ✅ Se buscan chunks similares en pgvector
- ✅ Se muestran resultados ordenados por relevancia
- ✅ Cada resultado muestra:
  - Nombre del documento
  - Porcentaje de relevancia (similarity)
  - Fragmento del texto
  - Opción para expandir

**Verificación técnica:**
```sql
-- Ver la función de búsqueda en acción
SELECT * FROM match_documents(
  ARRAY[0.1, 0.2, ...]::vector(1536),  -- Tu query embedding
  0.75,  -- Threshold
  10,    -- Límite
  'tu-project-id'::uuid
);
```

---

### Prueba 3: Generación de Reportes con RAG

#### Paso 1: Generar Reporte
1. Ve a la pestaña "Informes"
2. Haz clic en "Generar Informe"
3. Selecciona tipo: "Ejecutivo"
4. ✅ **Asegúrate de activar "Usar IA"**
5. Haz clic en "Generar Vista Previa"

**Qué debe pasar internamente:**
1. ✅ Sistema genera query basada en tipo de reporte
2. ✅ RAG busca top 15 chunks más relevantes
3. ✅ Se construye contexto con fragmentos relevantes
4. ✅ GPT-4o-mini genera reporte usando ese contexto
5. ✅ Reporte incluye referencias específicas a documentos

**Cómo validar que usa RAG:**
- Revisa la consola del navegador (F12)
- Busca logs que digan:
  ```
  🔍 Buscando contexto relevante con RAG...
  ✅ RAG encontró X chunks relevantes de Y documentos
  ```

#### Paso 2: Revisar Reporte
1. El reporte debería mencionar datos específicos de tus documentos
2. Debería tener referencias a chunks concretos
3. Los hallazgos deberían estar basados en evidencia real

---

### Prueba 4: Verificar Estadísticas RAG

**En consola del navegador (F12):**
```javascript
// Ver estadísticas del proyecto
const projectId = 'tu-project-id';

// Esta llamada interna mostraría stats
console.log('Verificando RAG stats...');
```

**En Supabase SQL:**
```sql
-- Estadísticas completas
SELECT 
  p.name as proyecto,
  COUNT(DISTINCT de.document_id) as docs_vectorizados,
  COUNT(de.id) as total_chunks,
  AVG(LENGTH(de.chunk_text)) as avg_chunk_size,
  MIN(de.created_at) as primer_embedding,
  MAX(de.created_at) as ultimo_embedding
FROM projects p
LEFT JOIN document_embeddings de ON p.id = de.project_id
GROUP BY p.id, p.name
ORDER BY total_chunks DESC;
```

---

## 🐛 Troubleshooting

### Problema: No se generan embeddings

**Verificar:**
1. OpenAI API key está configurada: `console.log(process.env.NEXT_PUBLIC_OPENAI_API_KEY)`
2. El documento tiene contenido extraído: Ver en lista de documentos
3. El contenido es >100 caracteres
4. Revisar logs de consola

**Solución:**
- Si es PDF/Word/Imagen: Añade descripción larga (>100 caracteres)
- Si es Excel/CSV: Verifica que se procesó correctamente

### Problema: Búsqueda no devuelve resultados

**Verificar:**
```sql
-- ¿Hay embeddings?
SELECT COUNT(*) FROM document_embeddings WHERE project_id = 'tu-project-id';

-- ¿La función existe?
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'match_documents';
```

**Solución:**
- Si no hay embeddings: Sube documentos nuevamente
- Si no existe función: Ejecuta migración de pgvector
- Baja el threshold a 0.70 (en SemanticSearch.tsx línea ~53)

### Problema: Error "extension vector does not exist"

**Solución:**
Ejecuta en Supabase SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## ✅ Checklist de Validación

- [ ] pgvector habilitado en Supabase
- [ ] Tabla `document_embeddings` creada
- [ ] Función `match_documents` existe
- [ ] Aplicación carga sin errores
- [ ] Puede subir documentos Excel/CSV
- [ ] Se extraen datos de Excel/CSV automáticamente
- [ ] Se generan embeddings (verificar en Supabase)
- [ ] Búsqueda semántica funciona
- [ ] Resultados tienen % de relevancia
- [ ] Generación de reportes usa RAG (ver logs)
- [ ] Reportes mencionan datos específicos

---

## 📊 Métricas de Éxito

**Sistema RAG funciona correctamente si:**

1. **Procesamiento:**
   - ✅ Excel/CSV se procesan completamente
   - ✅ Se generan N chunks por documento (N > 0)
   - ✅ Chunks se guardan en `document_embeddings`

2. **Búsqueda:**
   - ✅ Query devuelve resultados relevantes
   - ✅ Similarity score > 75%
   - ✅ Fragmentos mostrados coinciden con query

3. **Reportes:**
   - ✅ Menciona datos específicos de documentos
   - ✅ No es genérico (usa contexto RAG)
   - ✅ Logs muestran "RAG encontró X chunks"

---

## 🎯 Resultado Esperado

Al final de las pruebas deberías tener:

```
📊 Documentos subidos: 3-5
📦 Chunks generados: 15-50+
🔍 Búsquedas exitosas: 3+
📄 Reporte generado: 1 (con contexto RAG)
✅ Sistema RAG: FUNCIONANDO
```

---

## 🆘 Contacto

Si algo no funciona:
1. Revisa logs de consola (F12)
2. Ejecuta queries de verificación en Supabase
3. Consulta `SISTEMA_RAG.md` para más detalles
4. Verifica variables de entorno en `.env.local`

---

**¡Listo para probar! 🚀**
