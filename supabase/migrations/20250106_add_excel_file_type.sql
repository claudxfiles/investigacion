-- Migración: Agregar tipo 'excel' al CHECK constraint de file_type
-- 
-- PROBLEMA: La migración original solo permitía: 'pdf', 'word', 'image', 'other'
-- SOLUCIÓN: Eliminar el constraint viejo y crear uno nuevo que incluya 'excel'

-- 1. Eliminar el constraint existente
ALTER TABLE documents 
DROP CONSTRAINT IF EXISTS documents_file_type_check;

-- 2. Agregar nuevo constraint que incluye 'excel'
ALTER TABLE documents 
ADD CONSTRAINT documents_file_type_check 
CHECK (file_type IN ('pdf', 'word', 'image', 'excel', 'csv', 'other'));

-- Nota: Ahora permitimos:
-- - pdf: Archivos PDF
-- - word: Archivos Word (.doc, .docx)
-- - excel: Archivos Excel (.xls, .xlsx)
-- - csv: Archivos CSV
-- - image: Imágenes (jpg, png, etc)
-- - other: Cualquier otro tipo

-- Verificación (opcional, solo para debug):
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'documents'::regclass 
-- AND conname = 'documents_file_type_check';
