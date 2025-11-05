/**
 * Servicio para procesar y extraer texto de documentos
 * Soporta: PDF, Word, Excel, CSV, imágenes
 * Nota: Procesamiento simplificado en cliente. Para procesamiento avanzado se usa RAG.
 */

import * as XLSX from 'xlsx';

export class DocumentProcessor {
  /**
   * Extrae texto de un PDF (versión simplificada)
   * Nota: Para PDFs complejos, el texto se extraerá en el servidor
   */
  static async extractTextFromPDF(file: File): Promise<string> {
    return new Promise((resolve) => {
      // Por ahora, generamos metadata básica
      // El procesamiento real de PDF se hará en el backend cuando sea necesario
      let extractedText = `📄 ARCHIVO PDF: ${file.name}\n`;
      extractedText += `📊 Tamaño: ${(file.size / 1024).toFixed(2)} KB\n`;
      extractedText += `📅 Última modificación: ${new Date(file.lastModified).toLocaleString('es-ES')}\n`;
      extractedText += `\n${'='.repeat(60)}\n`;
      extractedText += `DOCUMENTO PDF CARGADO\n`;
      extractedText += `${'='.repeat(60)}\n\n`;
      extractedText += `Este es un archivo PDF que ha sido cargado al sistema.\n`;
      extractedText += `El contenido será procesado y estará disponible para búsqueda semántica.\n\n`;
      extractedText += `Para análisis detallado, utiliza la función de generación de reportes o búsqueda IA.\n`;
      
      resolve(extractedText);
    });
  }

  /**
   * Extrae texto de una imagen (metadata básica)
   * Nota: OCR completo se procesará cuando sea necesario
   */
  static async extractTextFromImage(file: File): Promise<string> {
    return new Promise((resolve) => {
      let extractedText = `🖼️ ARCHIVO DE IMAGEN: ${file.name}\n`;
      extractedText += `📊 Tamaño: ${(file.size / 1024).toFixed(2)} KB\n`;
      extractedText += `📊 Tipo: ${file.type}\n`;
      extractedText += `📅 Última modificación: ${new Date(file.lastModified).toLocaleString('es-ES')}\n`;
      extractedText += `\n${'='.repeat(60)}\n`;
      extractedText += `IMAGEN CARGADA\n`;
      extractedText += `${'='.repeat(60)}\n\n`;
      extractedText += `Esta es una imagen que ha sido cargada al sistema.\n`;
      extractedText += `La imagen estará disponible como referencia en el análisis.\n\n`;
      extractedText += `Para extraer texto mediante OCR, utiliza las herramientas de procesamiento avanzado.\n`;
      
      resolve(extractedText);
    });
  }

  /**
   * Extrae datos de un archivo Excel y los convierte en texto estructurado
   */
  static async extractDataFromExcel(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          
          let extractedText = `📊 ARCHIVO EXCEL: ${file.name}\n`;
          extractedText += `📁 Total de hojas: ${workbook.SheetNames.length}\n\n`;
          
          // Procesar cada hoja
          workbook.SheetNames.forEach((sheetName, index) => {
            const worksheet = workbook.Sheets[sheetName];
            
            // Convertir a JSON para análisis estructurado
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
            
            extractedText += `${'='.repeat(60)}\n`;
            extractedText += `📄 HOJA ${index + 1}: "${sheetName}"\n`;
            extractedText += `${'='.repeat(60)}\n\n`;
            
            if (jsonData.length === 0) {
              extractedText += '(Hoja vacía)\n\n';
              return;
            }
            
            // Identificar encabezados (primera fila con datos)
            const headers = jsonData[0] || [];
            extractedText += `📋 Columnas detectadas (${headers.length}): ${headers.map(h => `"${h}"`).join(', ')}\n`;
            extractedText += `📊 Total de filas de datos: ${jsonData.length - 1}\n\n`;
            
            // Extraer estadísticas básicas de cada columna
            if (headers.length > 0 && jsonData.length > 1) {
              extractedText += `📈 ANÁLISIS DE COLUMNAS:\n\n`;
              
              headers.forEach((header, colIndex) => {
                const columnValues = jsonData.slice(1)
                  .map(row => row[colIndex])
                  .filter(val => val !== undefined && val !== null && val !== '');
                
                if (columnValues.length > 0) {
                  extractedText += `  Columna: "${header}"\n`;
                  extractedText += `  - Valores no vacíos: ${columnValues.length}\n`;
                  
                  // Detectar tipo de datos predominante
                  const numericValues = columnValues.filter(v => !isNaN(Number(v)));
                  if (numericValues.length > columnValues.length * 0.5) {
                    // Columna numérica
                    const numbers = numericValues.map(v => Number(v));
                    const sum = numbers.reduce((a, b) => a + b, 0);
                    const avg = sum / numbers.length;
                    const min = Math.min(...numbers);
                    const max = Math.max(...numbers);
                    
                    extractedText += `  - Tipo: Numérico\n`;
                    extractedText += `  - Suma: ${sum.toFixed(2)}\n`;
                    extractedText += `  - Promedio: ${avg.toFixed(2)}\n`;
                    extractedText += `  - Mínimo: ${min}\n`;
                    extractedText += `  - Máximo: ${max}\n`;
                  } else {
                    // Columna de texto
                    const uniqueValues = [...new Set(columnValues)];
                    extractedText += `  - Tipo: Texto\n`;
                    extractedText += `  - Valores únicos: ${uniqueValues.length}\n`;
                    if (uniqueValues.length <= 5) {
                      extractedText += `  - Valores: ${uniqueValues.map(v => `"${v}"`).join(', ')}\n`;
                    }
                  }
                  extractedText += '\n';
                }
              });
            }
            
            // Mostrar primeras filas de datos (máximo 10)
            const rowsToShow = Math.min(10, jsonData.length);
            extractedText += `📝 MUESTRA DE DATOS (primeras ${rowsToShow} filas):\n\n`;
            
            jsonData.slice(0, rowsToShow).forEach((row, rowIndex) => {
              if (rowIndex === 0) {
                extractedText += `  [ENCABEZADOS] ${row.join(' | ')}\n`;
                extractedText += `  ${'-'.repeat(80)}\n`;
              } else {
                extractedText += `  [Fila ${rowIndex}] ${row.join(' | ')}\n`;
              }
            });
            
            if (jsonData.length > rowsToShow) {
              extractedText += `\n  ... (${jsonData.length - rowsToShow} filas adicionales no mostradas)\n`;
            }
            
            extractedText += '\n\n';
          });
          
          extractedText += `${'='.repeat(60)}\n`;
          extractedText += `✅ Extracción completada exitosamente\n`;
          extractedText += `📊 Resumen: ${workbook.SheetNames.length} hoja(s) procesada(s)\n`;
          
          resolve(extractedText);
        } catch (error) {
          console.error('Error al procesar Excel:', error);
          reject(new Error('Error al procesar el archivo Excel'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error al leer el archivo Excel'));
      };
      
      reader.readAsBinaryString(file);
    });
  }

  /**
   * Extrae texto de un documento Word (.doc, .docx)
   * Versión simplificada con metadata básica
   */
  static async extractTextFromWord(file: File): Promise<string> {
    return new Promise((resolve) => {
      let extractedText = `📝 ARCHIVO WORD: ${file.name}\n`;
      extractedText += `📊 Formato: ${file.name.endsWith('.docx') ? 'DOCX (Office Open XML)' : 'DOC (Microsoft Word)'}\n`;
      extractedText += `📊 Tamaño: ${(file.size / 1024).toFixed(2)} KB\n`;
      extractedText += `📅 Última modificación: ${new Date(file.lastModified).toLocaleString('es-ES')}\n`;
      extractedText += `\n${'='.repeat(60)}\n`;
      extractedText += `DOCUMENTO WORD CARGADO\n`;
      extractedText += `${'='.repeat(60)}\n\n`;
      extractedText += `Este es un documento Word que ha sido cargado al sistema.\n`;
      extractedText += `El contenido estará disponible para búsqueda y análisis.\n\n`;
      extractedText += `Para análisis detallado, utiliza la generación de reportes con IA.\n`;
      
      resolve(extractedText);
    });
  }

  /**
   * Procesa un archivo CSV y extrae los datos
   */
  static async extractDataFromCSV(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const csvText = e.target?.result as string;
          if (!csvText) {
            throw new Error('No se pudo leer el archivo CSV');
          }

          let extractedText = `📊 ARCHIVO CSV: ${file.name}\n`;
          
          // Detectar delimitador
          const delimiters = [',', ';', '\t', '|'];
          let bestDelimiter = ',';
          let maxColumns = 0;
          
          for (const delimiter of delimiters) {
            const firstLine = csvText.split('\n')[0];
            const columns = firstLine.split(delimiter).length;
            if (columns > maxColumns) {
              maxColumns = columns;
              bestDelimiter = delimiter;
            }
          }

          // Parsear CSV
          const lines = csvText.split('\n').filter(line => line.trim().length > 0);
          const headers = lines[0].split(bestDelimiter).map(h => h.trim().replace(/^"|"$/g, ''));
          
          extractedText += `📋 Columnas detectadas (${headers.length}): ${headers.map(h => `"${h}"`).join(', ')}\n`;
          extractedText += `📊 Total de filas de datos: ${lines.length - 1}\n`;
          extractedText += `🔤 Delimitador usado: "${bestDelimiter}"\n`;
          extractedText += `\n${'='.repeat(60)}\n`;
          extractedText += `CONTENIDO DEL CSV\n`;
          extractedText += `${'='.repeat(60)}\n\n`;
          
          // Mostrar primeras 20 filas
          const rowsToShow = Math.min(20, lines.length);
          lines.slice(0, rowsToShow).forEach((line, idx) => {
            const values = line.split(bestDelimiter).map(v => v.trim().replace(/^"|"$/g, ''));
            if (idx === 0) {
              extractedText += `[ENCABEZADOS] ${values.join(' | ')}\n`;
              extractedText += `${'-'.repeat(80)}\n`;
            } else {
              extractedText += `[Fila ${idx}] ${values.join(' | ')}\n`;
            }
          });

          if (lines.length > rowsToShow) {
            extractedText += `\n... (${lines.length - rowsToShow} filas adicionales no mostradas)\n`;
          }

          resolve(extractedText);
        } catch (error) {
          console.error('Error al procesar CSV:', error);
          reject(new Error('Error al procesar el archivo CSV'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error al leer el archivo CSV'));
      };
      
      reader.readAsText(file);
    });
  }

  /**
   * Procesa un documento y extrae su contenido
   */
  static async processDocument(file: File, fileType: string): Promise<string> {
    if (fileType === 'pdf') {
      return this.extractTextFromPDF(file);
    } else if (fileType === 'image') {
      return this.extractTextFromImage(file);
    } else if (fileType === 'excel') {
      return this.extractDataFromExcel(file);
    } else if (fileType === 'word') {
      return this.extractTextFromWord(file);
    } else if (fileType === 'csv') {
      return this.extractDataFromCSV(file);
    }
    
    return '';
  }

  /**
   * Analiza el contenido de un documento y genera un resumen
   */
  static async analyzeDocument(content: string, description?: string): Promise<{
    summary: string;
    keyPoints: string[];
    relevantEntities: string[];
  }> {
    // Por ahora, retornamos un análisis básico
    // En producción, podrías usar OpenAI para análisis más avanzado
    
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const keyPoints = sentences.slice(0, 5);
    
    return {
      summary: description || `Documento con ${sentences.length} oraciones analizadas.`,
      keyPoints,
      relevantEntities: [],
    };
  }
}

