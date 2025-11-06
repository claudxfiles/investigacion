/**
 * Servicio para procesar y extraer texto de documentos
 * Soporta: PDF, Word, Excel, CSV, imágenes
 * Nota: Procesamiento simplificado en cliente. Solo usa APIs disponibles (OpenAI + Supabase)
 */

import * as XLSX from 'xlsx';

export class DocumentProcessor {
  /**
   * Extrae texto REAL de un PDF usando PDF.js
   * Si el PDF está escaneado (poco texto), intenta OCR con Tesseract.js
   */
  static async extractTextFromPDF(file: File): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        console.log(`📄 [PDF] Iniciando extracción de texto de: ${file.name}`);
        
        // Importar PDF.js dinámicamente
        const pdfjsLib = await import('pdfjs-dist');
        
        // Configurar worker de PDF.js
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        
        // Leer archivo como ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        
        // Cargar documento PDF
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        console.log(`📊 [PDF] Documento cargado: ${pdf.numPages} páginas`);
        
        let fullText = '';
        
        // Extraer texto de cada página
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ')
            .trim();
          
          if (pageText.length > 0) {
            if (fullText.length > 0) {
              fullText += '\n\n';
            }
            fullText += pageText;
          }
          
          console.log(`📄 [PDF] Página ${pageNum}/${pdf.numPages} procesada (${pageText.length} caracteres)`);
        }
        
        console.log(`✅ [PDF] Extracción completada: ${fullText.length} caracteres totales`);
        
        // Si el texto es muy corto, probablemente es un PDF escaneado - intentar OCR
        if (fullText.length < 100) {
          console.warn(`⚠️ [PDF] Texto extraído muy corto (${fullText.length} chars).`);
          console.log(`🔄 [PDF] Intentando OCR con Tesseract.js...`);
          
          try {
            const ocrText = await this.performOCROnPDF(file, pdf, pdfjsLib);
            if (ocrText.length > fullText.length) {
              console.log(`✅ [OCR] Texto mejorado con OCR: ${ocrText.length} caracteres`);
              resolve(ocrText);
              return;
            }
          } catch (ocrError) {
            console.error(`❌ [OCR] Error en OCR:`, ocrError);
          }
        }
        
        resolve(fullText);
      } catch (error) {
        console.error('❌ [PDF] Error al extraer texto:', error);
        
        // Fallback a metadata básica si falla la extracción
        const fallbackText = `Archivo: ${file.name} (${(file.size / 1024).toFixed(2)} KB). No se pudo extraer texto automáticamente. El PDF puede ser una imagen escaneada o estar protegido.`;
        
        resolve(fallbackText);
      }
    });
  }

  /**
   * Realiza OCR en un PDF usando Tesseract.js
   */
  private static async performOCROnPDF(file: File, pdf: any, pdfjsLib: any): Promise<string> {
    const Tesseract = await import('tesseract.js');
    let ocrText = '';

    console.log(`🔍 [OCR] Procesando ${pdf.numPages} página(s) con Tesseract...`);

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        
        // Renderizar página como imagen
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        // Convertir canvas a blob
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => resolve(blob!), 'image/png');
        });

        // Realizar OCR
        console.log(`🔄 [OCR] Procesando página ${pageNum}/${pdf.numPages}...`);
        const { data: { text } } = await Tesseract.recognize(blob, 'spa+eng', {
          logger: (m: any) => {
            if (m.status === 'recognizing text') {
              console.log(`📊 [OCR] Página ${pageNum}: ${Math.round(m.progress * 100)}%`);
            }
          },
        });

        if (text.trim().length > 0) {
          if (ocrText.length > 0) {
            ocrText += '\n\n';
          }
          ocrText += text.trim();
          console.log(`✅ [OCR] Página ${pageNum} completada: ${text.length} caracteres`);
        }
      } catch (pageError) {
        console.error(`❌ [OCR] Error en página ${pageNum}:`, pageError);
      }
    }

    return ocrText;
  }

  /**
   * Extrae texto de una imagen usando Tesseract.js OCR
   */
  static async extractTextFromImage(file: File): Promise<string> {
    return new Promise(async (resolve) => {
      try {
        console.log(`🖼️ [Image] Iniciando OCR de imagen: ${file.name}`);
        
        const Tesseract = await import('tesseract.js');
        
        console.log(`🔄 [OCR] Procesando imagen con Tesseract...`);
        
        const { data: { text } } = await Tesseract.recognize(file, 'spa+eng', {
          logger: (m: any) => {
            if (m.status === 'recognizing text') {
              console.log(`📊 [OCR] Progreso: ${Math.round(m.progress * 100)}%`);
            }
          },
        });

        if (text.trim().length > 0) {
          console.log(`✅ [OCR] Texto extraído de imagen: ${text.length} caracteres`);
          resolve(text.trim());
        } else {
          console.warn(`⚠️ [OCR] No se detectó texto en la imagen`);
          resolve(`Imagen: ${file.name} (${(file.size / 1024).toFixed(2)} KB). No se detectó texto mediante OCR.`);
        }
      } catch (error) {
        console.error('❌ [OCR] Error al procesar imagen:', error);
        resolve(`Archivo de imagen: ${file.name} (${(file.size / 1024).toFixed(2)} KB). Error al procesar con OCR.`);
      }
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
          
          let extractedText = `📊 Archivo Excel: ${file.name}\n`;
          extractedText += `📁 Total de hojas: ${workbook.SheetNames.length}\n\n`;
          
          // Procesar cada hoja
          workbook.SheetNames.forEach((sheetName, index) => {
            const worksheet = workbook.Sheets[sheetName];
            
            // Convertir a JSON para análisis estructurado
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
            
            extractedText += `${'='.repeat(60)}\n`;
            extractedText += `Hoja ${index + 1}: "${sheetName}"\n`;
            extractedText += `${'='.repeat(60)}\n\n`;
            
            if (jsonData.length === 0) {
              extractedText += '(Hoja vacía)\n\n';
              return;
            }
            
            // Identificar encabezados (primera fila con datos)
            const headers = jsonData[0] || [];
            extractedText += `Columnas (${headers.length}): ${headers.map(h => `"${h}"`).join(', ')}\n`;
            extractedText += `Total de filas: ${jsonData.length - 1}\n\n`;
            
            // Extraer estadísticas básicas de cada columna
            if (headers.length > 0 && jsonData.length > 1) {
              extractedText += `Análisis de columnas:\n\n`;
              
              headers.forEach((header, colIndex) => {
                const columnValues = jsonData.slice(1)
                  .map(row => row[colIndex])
                  .filter(val => val !== undefined && val !== null && val !== '');
                
                if (columnValues.length > 0) {
                  extractedText += `  "${header}":\n`;
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
            extractedText += `Muestra de datos (primeras ${rowsToShow} filas):\n\n`;
            
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
          extractedText += `Extracción completada\n`;
          extractedText += `Resumen: ${workbook.SheetNames.length} hoja(s) procesada(s)\n`;
          
          console.log(`✅ [Excel] Extracción completada: ${file.name}`);
          resolve(extractedText);
        } catch (error) {
          console.error('❌ [Excel] Error al procesar:', error);
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
      const extractedText = `Archivo Word: ${file.name} (${(file.size / 1024).toFixed(2)} KB). Documento cargado en el sistema.`;
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

          let extractedText = `Archivo CSV: ${file.name}\n`;
          
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
          
          extractedText += `Columnas (${headers.length}): ${headers.map(h => `"${h}"`).join(', ')}\n`;
          extractedText += `Total de filas: ${lines.length - 1}\n`;
          extractedText += `Delimitador: "${bestDelimiter}"\n\n`;
          
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
            extractedText += `\n... (${lines.length - rowsToShow} filas adicionales)\n`;
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
    console.log(`📄 [DocumentProcessor] Procesando ${fileType}: ${file.name}`);
    
    try {
      if (fileType === 'pdf') {
        return await this.extractTextFromPDF(file);
      } else if (fileType === 'image') {
        return await this.extractTextFromImage(file);
      } else if (fileType === 'excel') {
        return await this.extractDataFromExcel(file);
      } else if (fileType === 'word') {
        return await this.extractTextFromWord(file);
      } else if (fileType === 'csv') {
        return await this.extractDataFromCSV(file);
      }
      
      return '';
    } catch (error) {
      console.error(`❌ [DocumentProcessor] Error procesando ${fileType}:`, error);
      throw error;
    }
  }
}
