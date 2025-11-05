-- Políticas de Storage para permitir archivos Excel
-- Ejecutar este SQL en el editor SQL de Supabase

-- 1. Eliminar políticas existentes del bucket 'documents' (si existen)
DROP POLICY IF EXISTS "Allow authenticated users to upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete documents" ON storage.objects;

-- 2. Crear políticas nuevas que permitan cualquier tipo de archivo
-- Política de subida (INSERT)
CREATE POLICY "Allow authenticated users to upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  auth.uid() IS NOT NULL
);

-- Política de lectura (SELECT)
CREATE POLICY "Allow authenticated users to read documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  auth.uid() IS NOT NULL
);

-- Política de actualización (UPDATE)
CREATE POLICY "Allow authenticated users to update documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' AND
  auth.uid() IS NOT NULL
)
WITH CHECK (
  bucket_id = 'documents' AND
  auth.uid() IS NOT NULL
);

-- Política de eliminación (DELETE)
CREATE POLICY "Allow authenticated users to delete documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  auth.uid() IS NOT NULL
);

-- 3. Actualizar configuración del bucket para permitir tipos MIME de Excel
-- NOTA: Esto debe hacerse desde la interfaz de Supabase Dashboard
-- Ve a Storage → documents → Configuration
-- En "Allowed MIME types", agrega:
--   - application/vnd.ms-excel
--   - application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
--   - application/pdf
--   - application/msword
--   - application/vnd.openxmlformats-officedocument.wordprocessingml.document
--   - image/jpeg
--   - image/png
--   - image/jpg

-- O si prefieres permitir TODOS los tipos, deja el campo vacío o usa:
-- Allowed MIME types: * (vacío = todos permitidos)
