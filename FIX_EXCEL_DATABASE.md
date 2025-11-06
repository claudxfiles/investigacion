# 🔧 Fix: Error al Subir Excel (Database Constraint)

## ❌ **Error Actual**

```
new row for relation "documents" violates check constraint "documents_file_type_check"
```

---

## 🎯 **Causa Raíz**

La tabla `documents` tiene un **CHECK constraint** que solo permite estos valores:
```sql
file_type IN ('pdf', 'word', 'image', 'other')
```

❌ **Falta**: `'excel'` y `'csv'`

---

## ✅ **SOLUCIÓN (1 minuto)**

### **Paso 1: Aplicar Migración SQL**

1. Ve a **Supabase Dashboard**: https://app.supabase.com
2. Selecciona tu proyecto
3. Ve a **SQL Editor**
4. Crea una **New Query**
5. Copia y pega este SQL:

```sql
-- Eliminar constraint viejo
ALTER TABLE documents 
DROP CONSTRAINT IF EXISTS documents_file_type_check;

-- Agregar constraint nuevo con 'excel' y 'csv'
ALTER TABLE documents 
ADD CONSTRAINT documents_file_type_check 
CHECK (file_type IN ('pdf', 'word', 'image', 'excel', 'csv', 'other'));
```

6. Haz clic en **Run** (▶️)
7. Deberías ver: `Success. No rows returned`

### **Paso 2: Verificar (Opcional)**

Ejecuta esta query para confirmar:

```sql
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'documents'::regclass 
AND conname = 'documents_file_type_check';
```

Deberías ver:
```
CHECK ((file_type = ANY (ARRAY['pdf', 'word', 'image', 'excel', 'csv', 'other'])))
```

### **Paso 3: Probar**

1. Recarga la aplicación (Ctrl+Shift+R)
2. Intenta subir el archivo Excel
3. Debería funcionar ✅

---

## 📋 **Tipos de Archivo Ahora Permitidos**

| file_type | Extensiones | Descripción |
|-----------|-------------|-------------|
| `pdf` | .pdf | Archivos PDF |
| `word` | .doc, .docx | Microsoft Word |
| `excel` | .xls, .xlsx | Microsoft Excel ⭐ NUEVO |
| `csv` | .csv | Valores separados por comas ⭐ NUEVO |
| `image` | .jpg, .png, .gif | Imágenes |
| `other` | * | Cualquier otro tipo |

---

## 🔍 **Por Qué Pasó Esto**

La migración original (`20251103202829_create_document_analysis_system.sql`) tenía esta línea:

```sql
file_type text NOT NULL CHECK (file_type IN ('pdf', 'word', 'image', 'other')),
```

Esta restricción impedía insertar filas con `file_type = 'excel'`.

---

## 🆘 **Si el Problema Persiste**

### **Verificar que el constraint se eliminó:**

```sql
-- Ver todos los constraints de la tabla documents
SELECT conname 
FROM pg_constraint 
WHERE conrelid = 'documents'::regclass;
```

Si todavía ves un constraint problemático, elimínalo manualmente:

```sql
ALTER TABLE documents 
DROP CONSTRAINT <nombre_del_constraint>;
```

### **Verificar tipo de archivo en el código:**

El código en `components/DocumentUpload.tsx` usa esta función:

```typescript
const getFileType = (file: File): 'pdf' | 'word' | 'image' | 'excel' | 'other' => {
  // Detecta por extensión:
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return 'excel';
  // ...
}
```

Esto está correcto y retorna `'excel'` para archivos .xlsx/.xls.

---

## 📦 **Archivos Relacionados**

- **Migración nueva**: `supabase/migrations/20250106_add_excel_file_type.sql`
- **Migración original**: `supabase/migrations/20251103202829_create_document_analysis_system.sql`
- **Código de detección**: `components/DocumentUpload.tsx` (línea 85-102)

---

## ⏱️ **Resumen**

- **Problema**: CHECK constraint en base de datos no incluía 'excel'
- **Solución**: Ejecutar migración SQL que actualiza el constraint
- **Tiempo**: 1 minuto
- **Dificultad**: ⭐ Muy fácil

---

🎯 **Después de aplicar esta migración, los archivos Excel se subirán correctamente!**
