# Sistema de Análisis de Documentos con IA

Sistema completo para gestión de proyectos, análisis de documentos y generación de informes inteligentes con integración de Inteligencia Artificial, completamente en español.

## 🚀 Características

- **Gestión de Proyectos**: Crea y gestiona proyectos de tipo general, financiero o legal
- **Subida de Documentos**: Sube documentos PDF, Word, Excel, CSV e imágenes
- **📊 Soporte Multi-Formato**: 
  - PDFs con extracción completa de texto
  - Word (.doc, .docx) con procesamiento avanzado
  - Excel (.xlsx, .xls) con análisis de datos tabulares y estadísticas
  - CSV con detección automática de delimitadores
  - Imágenes con OCR (español + inglés) usando Tesseract.js
- **🧠 Sistema RAG Completo**: 
  - Búsqueda semántica usando embeddings de OpenAI
  - Vectorización automática con pgvector en Supabase
  - Chunking inteligente con overlap para mantener contexto
  - Búsqueda por similitud coseno con scores de relevancia
- **🔍 Búsqueda Semántica IA**: 
  - Interfaz de búsqueda inteligente en documentos
  - Resultados ordenados por relevancia
  - Destacado de términos relevantes
  - Contexto expandible
- **Análisis Inteligente con IA Mejorado**: 
  - Genera informes profesionales usando OpenAI GPT-4o-mini (en español)
  - Usa RAG para encontrar contexto relevante automáticamente
  - Referencias específicas a fragmentos de documentos
  - Análisis basado en evidencia concreta
- **✨ Vista Previa Editable**: Edita y personaliza los informes antes de generarlos
- **Generación de Informes**: Crea informes ejecutivos, técnicos, de cumplimiento o financieros
- **Visualización de Informes**: Visualiza y exporta informes completos
- **Interfaz en Español**: Toda la aplicación está en español

## 📋 Requisitos Previos

- Node.js 18+ y npm
- Cuenta de Supabase con extensión pgvector habilitada
- Cuenta de OpenAI (requerida para RAG y análisis con IA)

## 🔧 Configuración

### 1. Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL= 
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# OpenAI Configuration (Opcional - para análisis con IA)
# Obtén tu API key en: https://platform.openai.com/api-keys
NEXT_PUBLIC_OPENAI_API_KEY=tu_api_key_de_openai
```

### 2. Instalar Dependencias

```bash
npm install
```

## 🏃 Ejecutar la Aplicación

### Modo Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

### Compilar para Producción

```bash
npm run build
```

### Iniciar en Producción

```bash
npm start
```

## 🚀 Desplegar en Vercel

1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno en Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_OPENAI_API_KEY` (opcional)
3. Vercel detectará automáticamente Next.js y desplegará la aplicación

## 📊 Base de Datos

Las tablas en Supabase:

- `projects` - Proyectos de análisis
- `documents` - Documentos subidos con texto extraído
- `document_embeddings` - **NUEVO**: Vectores para búsqueda semántica (pgvector)
- `reports` - Informes generados
- `document_references` - Referencias entre informes y documentos
- `n8n_workflows` - Integraciones de automatización (para uso futuro)

### 🚀 Setup de pgvector

**IMPORTANTE**: Debes ejecutar la migración de pgvector en Supabase:

1. Accede al SQL Editor de Supabase
2. Ejecuta el script: `supabase/migrations/20250105_enable_pgvector.sql`
3. Verifica la instalación con:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'vector';
   ```

Para más detalles, consulta: `supabase/SETUP_RAG.md`

## ✨ Nuevas Funcionalidades

### 📊 Soporte para Archivos Excel

El sistema ahora puede procesar archivos Excel (.xlsx, .xls) y extraer automáticamente:

- **Estructura de datos**: Identifica columnas, tipos de datos y hojas
- **Análisis estadístico**: Calcula sumas, promedios, máximos y mínimos
- **Detección de patrones**: Identifica tendencias y valores únicos
- **Vista previa de datos**: Muestra las primeras filas de cada hoja
- **Análisis con IA**: La IA puede interpretar tablas y generar insights cuantitativos

### 🎨 Vista Previa Editable de Informes

Antes de generar el informe final, puedes:

- **Ver vista previa completa**: Revisa todo el contenido antes de guardarlo
- **Editar en tiempo real**: Modifica resumen ejecutivo, hallazgos y recomendaciones
- **Agregar/eliminar secciones**: Personaliza el informe según tus necesidades
- **Ajustar prioridades**: Cambia la severidad de hallazgos y prioridad de recomendaciones
- **Gestionar pasos accionables**: Edita y organiza los pasos de cada recomendación
- **Alternar entre vista previa y edición**: Cambia fácilmente entre modos

## 🤖 Análisis con IA

El sistema puede generar informes de dos formas:

### 1. Análisis Básico (Sin IA)
- Genera informes usando plantillas predefinidas
- Funciona sin configuración adicional
- Útil para casos simples
- **Todo en español**

### 2. Análisis Inteligente con IA (OpenAI)
- Analiza el contenido real de los documentos
- Genera insights, hallazgos y recomendaciones personalizadas
- **Todos los reportes generados están en español**
- Requiere configuración de `NEXT_PUBLIC_OPENAI_API_KEY`

**Nota**: Si no tienes una API key de OpenAI, el sistema funcionará con el modo básico automáticamente.

## 📝 Uso

1. **Crear un Proyecto**
   - Haz clic en "Nuevo Proyecto"
   - Selecciona el tipo (General, Financiero, Legal)
   - Añade una descripción

2. **Subir Documentos**
   - Selecciona un proyecto
   - Haz clic en "Subir Documentos"
   - Selecciona archivos: PDF, Word, Excel, CSV o imágenes
   - Añade descripciones opcionales
   - **Procesamiento automático**:
     - Extracción de texto según el formato
     - OCR para imágenes (Tesseract.js)
     - Análisis de datos para Excel/CSV
     - Generación automática de embeddings (RAG)
     - Vectorización y almacenamiento en pgvector

3. **🔍 Buscar en Documentos (NUEVO)**
   - Ve a la pestaña "🔍 Búsqueda IA"
   - Ingresa tu consulta en lenguaje natural
   - Ejemplos:
     - "¿Cuáles son los principales riesgos identificados?"
     - "Resumen de conclusiones financieras"
     - "Recomendaciones de cumplimiento normativo"
   - Obtén resultados ordenados por relevancia
   - Cada resultado muestra:
     - Documento de origen
     - Porcentaje de relevancia
     - Fragmento con términos destacados
     - Opción para expandir contexto completo

4. **Generar Informe**
   - Ve a la pestaña "Informes"
   - Haz clic en "Generar Informe"
   - Selecciona el tipo de informe
   - Activa el análisis con IA (recomendado)
   - **🧠 El sistema RAG busca automáticamente contexto relevante**
   - Haz clic en "Generar Vista Previa"
   - **✨ Edita el informe en la vista previa antes de generarlo**
   - Personaliza secciones, hallazgos y recomendaciones
   - Guarda el informe final
   - **Los informes se generan completamente en español**

5. **Ver y Exportar Informes**
   - Haz clic en cualquier informe para verlo
   - Usa el botón "Exportar" para descargarlo como archivo de texto

## 🔐 Autenticación

El sistema usa Supabase Auth. Necesitas:
1. Registrarte con un email y contraseña
2. Verificar tu email (si está habilitado en Supabase)

### Recuperación de Contraseña

Si olvidaste tu contraseña:
1. En la pantalla de inicio de sesión, haz clic en "¿Olvidaste tu contraseña?"
2. Ingresa tu email
3. Revisa tu correo electrónico para el enlace de recuperación
4. Haz clic en el enlace y establece una nueva contraseña

## 🛠️ Tecnologías

- **Frontend**: Next.js 14 + React + TypeScript
- **UI**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Storage + Auth + pgvector)
- **IA**: 
  - OpenAI GPT-4o-mini para generación de texto
  - OpenAI text-embedding-3-small para embeddings (1536 dimensiones)
- **RAG**: 
  - pgvector para búsqueda vectorial
  - Chunking inteligente con overlap
  - Búsqueda por similitud coseno
- **Procesamiento de Documentos**:
  - SheetJS (xlsx) para Excel
  - Mammoth.js para Word
  - pdf-parse para PDFs
  - Tesseract.js para OCR en imágenes
- **Iconos**: Lucide React
- **Despliegue**: Vercel

## 📦 Estructura del Proyecto

```
app/
├── layout.tsx          # Layout principal
├── page.tsx            # Página principal
└── globals.css         # Estilos globales

components/
├── Auth.tsx                # Autenticación
├── Dashboard.tsx           # Dashboard principal
├── ProjectList.tsx         # Lista de proyectos
├── CreateProject.tsx       # Crear proyecto
├── ProjectDashboard.tsx    # Dashboard del proyecto (con búsqueda IA)
├── DocumentUpload.tsx      # Subir documentos (procesamiento automático + RAG)
├── DocumentList.tsx        # Lista de documentos
├── SemanticSearch.tsx      # 🔍 Búsqueda semántica con IA ✨ NUEVO
├── ReportGenerator.tsx     # Generador de informes (con RAG integrado)
├── ReportPreviewEditor.tsx # Editor de vista previa de informes ✨ NUEVO
├── ReportViewer.tsx        # Visor de informes
└── ResetPassword.tsx       # Restablecer contraseña

contexts/
└── AuthContext.tsx     # Contexto de autenticación

lib/
├── supabase.ts             # Cliente de Supabase
├── ai-service.ts           # Servicio de IA mejorado con RAG (en español)
├── document-processor.ts   # Procesamiento multi-formato ✨ MEJORADO
├── embedding-service.ts    # Generación de embeddings con OpenAI ✨ NUEVO
└── rag-service.ts          # Servicio RAG completo ✨ NUEVO

types/
└── index.ts            # Definiciones TypeScript
```

## 🐛 Solución de Problemas

### Error: "Missing Supabase environment variables"
- Verifica que el archivo `.env.local` existe y tiene las variables correctas
- Reinicia el servidor de desarrollo después de crear/modificar `.env.local`

### Error: "OpenAI API key not configured"
- Esto es normal si no usas IA
- El sistema funcionará en modo básico automáticamente
- Si quieres usar IA, añade `NEXT_PUBLIC_OPENAI_API_KEY` a tu `.env.local`

### Error al subir documentos
- Verifica que el bucket `documents` existe en Supabase Storage
- Verifica las políticas de acceso del bucket

## 📄 Licencia

Este proyecto es de código abierto.
