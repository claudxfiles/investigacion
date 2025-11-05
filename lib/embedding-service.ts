/**
 * Servicio para generar embeddings usando OpenAI
 */

export interface EmbeddingResult {
  embedding: number[];
  text: string;
  tokens: number;
}

export class EmbeddingService {
  private static apiKey: string;
  private static apiUrl: string = 'https://api.openai.com/v1/embeddings';
  private static model: string = 'text-embedding-3-small'; // 1536 dimensions, cost-effective

  static initialize(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Genera un embedding para un texto dado
   */
  static async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          input: text,
          model: this.model,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Error generating embedding');
      }

      const data = await response.json();
      
      return {
        embedding: data.data[0].embedding,
        text: text,
        tokens: data.usage.total_tokens,
      };
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Genera embeddings para múltiples textos en batch
   * OpenAI permite hasta 2048 inputs en una sola request
   */
  static async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (texts.length === 0) {
      return [];
    }

    // Filtrar textos vacíos
    const validTexts = texts.filter(t => t && t.trim().length > 0);
    
    if (validTexts.length === 0) {
      return [];
    }

    // Dividir en batches de 100 para evitar límites de API
    const batchSize = 100;
    const results: EmbeddingResult[] = [];

    for (let i = 0; i < validTexts.length; i += batchSize) {
      const batch = validTexts.slice(i, i + batchSize);
      
      try {
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            input: batch,
            model: this.model,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || 'Error generating embeddings');
        }

        const data = await response.json();
        
        // Mapear resultados
        const batchResults = data.data.map((item: any, idx: number) => ({
          embedding: item.embedding,
          text: batch[idx],
          tokens: data.usage.total_tokens / batch.length, // Aproximado
        }));

        results.push(...batchResults);
      } catch (error) {
        console.error(`Error generating embeddings for batch ${i / batchSize + 1}:`, error);
        throw error;
      }
    }

    return results;
  }

  /**
   * Calcula la similitud coseno entre dos vectores
   */
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Estima el número de tokens en un texto
   * Aproximación: 1 token ≈ 4 caracteres en español
   */
  static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Divide texto en chunks de tamaño máximo especificado
   */
  static chunkText(text: string, maxTokens: number = 1000, overlapTokens: number = 200): string[] {
    const chunks: string[] = [];
    
    // Dividir por párrafos primero
    const paragraphs = text.split(/\n\n+/);
    
    let currentChunk = '';
    let currentTokens = 0;

    for (const paragraph of paragraphs) {
      const paragraphTokens = this.estimateTokens(paragraph);
      
      // Si un párrafo solo es muy grande, dividirlo por oraciones
      if (paragraphTokens > maxTokens) {
        // Guardar chunk actual si existe
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
          currentTokens = 0;
        }
        
        // Dividir párrafo grande por oraciones
        const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
        
        for (const sentence of sentences) {
          const sentenceTokens = this.estimateTokens(sentence);
          
          if (currentTokens + sentenceTokens > maxTokens) {
            if (currentChunk) {
              chunks.push(currentChunk.trim());
              
              // Mantener overlap con últimas oraciones
              const overlapText = this.getLastTokens(currentChunk, overlapTokens);
              currentChunk = overlapText + ' ' + sentence;
              currentTokens = this.estimateTokens(currentChunk);
            } else {
              // Oración sola muy larga, agregarla directamente
              chunks.push(sentence.trim());
            }
          } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
            currentTokens += sentenceTokens;
          }
        }
      } else {
        // Agregar párrafo completo si cabe
        if (currentTokens + paragraphTokens > maxTokens) {
          if (currentChunk) {
            chunks.push(currentChunk.trim());
            
            // Mantener overlap
            const overlapText = this.getLastTokens(currentChunk, overlapTokens);
            currentChunk = overlapText + '\n\n' + paragraph;
            currentTokens = this.estimateTokens(currentChunk);
          }
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
          currentTokens += paragraphTokens;
        }
      }
    }

    // Agregar último chunk
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.length > 0);
  }

  /**
   * Obtiene los últimos N tokens de un texto
   */
  private static getLastTokens(text: string, tokenCount: number): string {
    const estimatedChars = tokenCount * 4;
    if (text.length <= estimatedChars) {
      return text;
    }
    
    // Intentar cortar en un espacio o punto
    let cutPosition = text.length - estimatedChars;
    const searchText = text.substring(cutPosition);
    const lastPeriod = searchText.lastIndexOf('.');
    const lastSpace = searchText.lastIndexOf(' ');
    
    const bestCut = Math.max(lastPeriod, lastSpace);
    if (bestCut > 0) {
      return searchText.substring(bestCut + 1).trim();
    }
    
    return searchText.trim();
  }
}
