# 🔧 Fix: Error al Subir Excel

## ❌ Error Actual

```
mime type application/vnd.openxmlformats-officedocument.spreadsheetml.sheet is not supported
```

## 🎯 Causa

El **bucket de Supabase Storage** `documents` tiene restricciones de tipos MIME que no incluyen archivos Excel.

---

## ✅ SOLUCIÓN (2 minutos)

### Opción 1: Permitir TODOS los Tipos (Recomendado)

1. Ve a **Supabase Dashboard**: https://app.supabase.com
2. Selecciona tu proyecto
3. Ve a **Storage** (en el menú lateral)
4. Clic en el bucket **`documents`**
5. Clic en **Settings** (⚙️) o **Configuration**
6. Busca **"Allowed MIME types"**
7. **DEJA EL CAMPO VACÍO** (esto permite todos los tipos)
8. Clic en **Save**

### Opción 2: Permitir Tipos Específicos

Si prefieres restringir, agrega estos tipos MIME:

```
application/pdf
application/msword
application/vnd.openxmlformats-officedocument.wordprocessingml.document
application/vnd.ms-excel
application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
application/vnd.ms-excel.sheet.macroEnabled.12
image/jpeg
image/png
image/jpg
image/gif
text/csv
text/plain
```

**En Supabase Dashboard**:
1. Storage → documents → Configuration
2. "Allowed MIME types" → Pega la lista de arriba (una por línea o separados por coma)
3. Save

---

## 🔍 Verificación

Después de aplicar el cambio:

1. **Recarga la aplicación** (Ctrl+Shift+R)
2. **Intenta subir el Excel de nuevo**
3. Debería funcionar ✅

---

## 📋 Tipos MIME Comunes

| Archivo | MIME Type |
|---------|-----------|
| Excel nuevo (.xlsx) | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| Excel antiguo (.xls) | `application/vnd.ms-excel` |
| Word nuevo (.docx) | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| Word antiguo (.doc) | `application/msword` |
| PDF | `application/pdf` |
| JPG/JPEG | `image/jpeg` |
| PNG | `image/png` |
| CSV | `text/csv` |

---

## 🆘 Si el Problema Persiste

### Verifica que el bucket existe:

1. Ve a Storage en Supabase
2. Debería existir un bucket llamado **`documents`**
3. Si no existe, créalo:
   - Clic en **New bucket**
   - Name: `documents`
   - Public: ❌ (desactivado)
   - File size limit: 50 MB (o lo que prefieras)
   - Allowed MIME types: (dejar vacío)

### Verifica políticas RLS:

Las políticas ya están en `supabase/storage-policies.sql`.

Si no están aplicadas:
1. Ve a SQL Editor en Supabase
2. Copia el contenido de `supabase/storage-policies.sql`
3. Ejecuta el SQL

---

## 💡 Alternativa Temporal

Si no puedes cambiar la configuración de Supabase ahora, puedes:

1. **Convertir Excel a CSV** temporalmente
2. O **copiar los datos** y pegarlos en la descripción del documento
3. Pero lo ideal es **arreglar el bucket** (toma solo 2 minutos)

---

## 📞 Resumen

**Problema**: Bucket de Supabase rechaza tipos MIME de Excel  
**Solución**: Configurar "Allowed MIME types" en Supabase Dashboard  
**Tiempo**: 2 minutos  
**Dificultad**: ⭐ Muy fácil  

🎯 **Después del fix, todos los tipos de archivo funcionarán correctamente!**
