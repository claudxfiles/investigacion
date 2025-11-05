/**
 * Servicio para procesar y extraer texto de documentos
 * 
 * NOTA: Este módulo solo debe usarse en el cliente (no en SSR)
 */

export class DocumentProcessor {
  /**
   * Extrae texto de un PDF usando una API route en el servidor
   * Esto evita problemas con pdfjs-dist en el cliente
   */
  static async extractTextFromPDF(file: File): Promise<string> {
    // Verificar que estamos en el cliente
    if (typeof window === 'undefined') {
      throw new Error('extractTextFromPDF solo está disponible en el cliente (navegador)');
    }

    try {
      // Enviar el archivo a la API route para procesamiento en el servidor
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/extract-pdf-text', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al procesar el PDF');
      }

      const data = await response.json();
      return data.text || '';
    } catch (error: any) {
      console.error('Error extrayendo texto del PDF:', error);
      throw new Error(`Error al extraer texto del PDF: ${error.message}`);
    }
  }

  /**
   * Extrae texto de una imagen usando OpenAI Vision API (si está disponible)
   */
  static async extractTextFromImage(file: File): Promise<string> {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key no configurada. No se puede extraer texto de imágenes.');
    }

    try {
      // Convertir imagen a base64
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const mimeType = file.type || 'image/png';

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extrae todo el texto visible en esta imagen. Si hay tablas, inclúyelas en formato texto. Si no hay texto, indica "No se encontró texto en la imagen".'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64}`
                  }
                }
              ]
            }
          ],
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Error al procesar la imagen');
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'No se pudo extraer texto de la imagen';
    } catch (error: any) {
      console.error('Error extrayendo texto de la imagen:', error);
      throw new Error(`Error al extraer texto de la imagen: ${error.message}`);
    }
  }

  /**
   * Divide el texto en chunks para embeddings
   */
  static chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+\s+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const sentenceWithPunctuation = sentence.trim() + '.';
      
      if (currentChunk.length + sentenceWithPunctuation.length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        
        // Overlap: mantener las últimas oraciones del chunk anterior
        const overlapSentences = currentChunk.split(/[.!?]+\s+/).slice(-3);
        currentChunk = overlapSentences.join('. ') + '. ' + sentenceWithPunctuation;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentenceWithPunctuation;
      }
    }
    
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.filter(chunk => chunk.length > 50); // Filtrar chunks muy pequeños
  }

  /**
   * Procesa un documento y extrae su contenido
   */
  static async processDocument(file: File, fileType: string): Promise<string> {
    if (fileType === 'pdf') {
      return this.extractTextFromPDF(file);
    } else if (fileType === 'image') {
      return this.extractTextFromImage(file);
    }
    
    // Para Word y otros formatos, por ahora retornamos vacío
    // Se puede implementar con libraries como mammoth para Word
    return '';
  }
}
