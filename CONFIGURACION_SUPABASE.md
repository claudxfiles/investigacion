# 🔧 Configuración de Supabase para Soporte de Excel

## ⚠️ Problema Actual

Recibes el error:
```
mime type application/vnd.openxmlformats-officedocument.spreadsheetml.sheet is not supported
```

Este error ocurre porque **Supabase Storage** tiene restricciones en los tipos MIME permitidos.

---

## ✅ Solución: Configurar Supabase Storage

### Opción 1: Desde Supabase Dashboard (Recomendado)

1. **Accede a tu Dashboard de Supabase**
   - URL: https://app.supabase.com
   - Inicia sesión con tu cuenta

2. **Selecciona tu proyecto**
   - Proyecto: El que uses para esta aplicación

3. **Ve a Storage**
   - En el menú lateral, haz clic en **"Storage"**

4. **Selecciona el bucket "documents"**
   - Haz clic en el bucket llamado **"documents"**
   - Si no existe, créalo primero

5. **Configurar tipos MIME permitidos**
   - Haz clic en **"Settings"** o **"Configuration"** del bucket
   - Busca la sección **"Allowed MIME types"**
   - **Opción A - Permitir tipos específicos:**
     ```
     application/pdf
     application/msword
     application/vnd.openxmlformats-officedocument.wordprocessingml.document
     application/vnd.ms-excel
     application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
     image/jpeg
     image/jpg
     image/png
     ```
   
   - **Opción B - Permitir todos los tipos (Más fácil):**
     - Deja el campo **VACÍO** o pon un asterisco `*`
     - Esto permitirá cualquier tipo de archivo

6. **Guardar cambios**
   - Haz clic en **"Save"** o **"Update"**

---

### Opción 2: Desde SQL Editor

1. **Ve al SQL Editor**
   - En el menú lateral de Supabase, haz clic en **"SQL Editor"**

2. **Ejecuta el siguiente SQL**
   ```sql
   -- Actualizar bucket para permitir todos los tipos MIME
   UPDATE storage.buckets 
   SET allowed_mime_types = NULL 
   WHERE id = 'documents';
   ```

3. **O especifica los tipos permitidos**
   ```sql
   UPDATE storage.buckets 
   SET allowed_mime_types = ARRAY[
     'application/pdf',
     'application/msword',
     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
     'application/vnd.ms-excel',
     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
     'image/jpeg',
     'image/jpg',
     'image/png'
   ]
   WHERE id = 'documents';
   ```

---

### Opción 3: Verificar y Actualizar Políticas (Opcional)

Si aún tienes problemas, ejecuta el SQL del archivo `supabase/storage-policies.sql`:

```bash
# Lee el archivo storage-policies.sql y ejecútalo en Supabase SQL Editor
```

---

## 🧪 Verificar que Funciona

1. **Recarga tu aplicación**
   - Presiona `Ctrl + Shift + R` para recargar completamente

2. **Intenta subir un archivo Excel**
   - Arrastra un archivo `.xlsx` o `.xls`
   - Debería aceptarse sin errores

3. **Verifica en Supabase**
   - Ve a Storage → documents
   - Deberías ver tu archivo Excel subido

---

## 🔍 Diagnóstico Adicional

Si el error persiste, verifica:

### 1. Bucket Configuration
```sql
-- Verificar configuración del bucket
SELECT 
  id,
  name,
  allowed_mime_types,
  public
FROM storage.buckets 
WHERE id = 'documents';
```

**Resultado esperado:**
- `allowed_mime_types`: NULL (permite todos) o array con tipos Excel incluidos
- `public`: false (para seguridad)

### 2. Storage Policies
```sql
-- Verificar políticas activas
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects';
```

**Debe haber políticas para:**
- INSERT (subir archivos)
- SELECT (leer archivos)
- UPDATE (actualizar archivos)
- DELETE (eliminar archivos)

### 3. Crear bucket si no existe
```sql
-- Crear bucket 'documents' si no existe
INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  NULL  -- NULL = permite todos los tipos
)
ON CONFLICT (id) DO NOTHING;
```

---

## 📝 Pasos Rápidos (TL;DR)

```
1. Accede a Supabase Dashboard
2. Storage → documents bucket
3. Settings → Allowed MIME types
4. Deja VACÍO o agrega tipos de Excel
5. Save
6. Recarga tu aplicación
7. ¡Prueba subir Excel!
```

---

## 🆘 Solución de Emergencia

Si nada funciona, ejecuta esto en SQL Editor:

```sql
-- Solución rápida: Permitir TODO
UPDATE storage.buckets 
SET 
  allowed_mime_types = NULL,
  public = false
WHERE id = 'documents';

-- Recrear políticas
DROP POLICY IF EXISTS "Allow authenticated users to upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete documents" ON storage.objects;

CREATE POLICY "Allow authenticated users to upload documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Allow authenticated users to read documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Allow authenticated users to update documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Allow authenticated users to delete documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents');
```

---

## 💡 Nota Importante

El mensaje de error **"mime type ... is not supported"** viene directamente de **Supabase Storage**, no del código de la aplicación. Por eso necesitas configurar el bucket en Supabase.

Una vez configurado correctamente, los archivos Excel se subirán sin problemas y el procesador automático extraerá todos los datos tabulares.

---

## ✅ Confirmación

Después de configurar, deberías poder:
- ✅ Arrastrar archivos .xlsx y .xls
- ✅ Ver icono verde 📊 para Excel
- ✅ Subir sin errores
- ✅ Ver datos extraídos automáticamente
- ✅ Generar informes con análisis de Excel

---

**¿Necesitas ayuda?** Comparte el resultado de las queries de diagnóstico y te ayudaré más específicamente.
