# Sistema de Análisis de Documentos con IA

Sistema completo para gestión de proyectos, análisis de documentos y generación de informes inteligentes con integración de Inteligencia Artificial, completamente en español.

## 🚀 Características

- **Gestión de Proyectos**: Crea y gestiona proyectos de tipo general, financiero o legal
- **Subida de Documentos**: Sube documentos PDF, Word e imágenes
- **Análisis Inteligente con IA**: Genera informes profesionales usando OpenAI GPT (en español)
- **Generación de Informes**: Crea informes ejecutivos, técnicos, de cumplimiento o financieros
- **Visualización de Informes**: Visualiza y exporta informes completos
- **Interfaz en Español**: Toda la aplicación está en español

## 📋 Requisitos Previos

- Node.js 18+ y npm
- Cuenta de Supabase (ya configurada)
- Cuenta de OpenAI (opcional, para análisis con IA)

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

Las tablas ya han sido creadas en Supabase:

- `projects` - Proyectos de análisis
- `documents` - Documentos subidos
- `reports` - Informes generados
- `document_references` - Referencias entre informes y documentos
- `n8n_workflows` - Integraciones de automatización (para uso futuro)

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
   - Selecciona archivos PDF, Word o imágenes
   - Añade descripciones opcionales

3. **Generar Informe**
   - Ve a la pestaña "Informes"
   - Haz clic en "Generar Informe"
   - Selecciona el tipo de informe
   - Activa/desactiva el análisis con IA si está disponible
   - Haz clic en "Generar Informe"
   - **Los informes se generan completamente en español**

4. **Ver y Exportar Informes**
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
- **Backend**: Supabase (PostgreSQL + Storage + Auth)
- **IA**: OpenAI GPT-4o-mini (opcional)
- **Iconos**: Lucide React
- **Despliegue**: Vercel

## 📦 Estructura del Proyecto

```
app/
├── layout.tsx          # Layout principal
├── page.tsx            # Página principal
└── globals.css         # Estilos globales

components/
├── Auth.tsx            # Autenticación
├── Dashboard.tsx       # Dashboard principal
├── ProjectList.tsx     # Lista de proyectos
├── CreateProject.tsx   # Crear proyecto
├── ProjectDashboard.tsx # Dashboard del proyecto
├── DocumentUpload.tsx  # Subir documentos
├── DocumentList.tsx    # Lista de documentos
├── ReportGenerator.tsx # Generador de informes (con IA)
├── ReportViewer.tsx    # Visor de informes
└── ResetPassword.tsx   # Restablecer contraseña

contexts/
└── AuthContext.tsx     # Contexto de autenticación

lib/
├── supabase.ts         # Cliente de Supabase
└── ai-service.ts       # Servicio de IA (en español)

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
# investigacion
