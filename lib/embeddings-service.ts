/**
 * Servicio para generar embeddings usando OpenAI
 */

export class EmbeddingsService {
  private static apiKey: string | null = null;
  private static apiUrl: string = 'https://api.openai.com/v1/embeddings';

  static initialize(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Genera un embedding para un texto usando OpenAI
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key no está configurada. Por favor, establece NEXT_PUBLIC_OPENAI_API_KEY en tus variables de entorno.');
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text.substring(0, 8000), // Limitar a 8000 caracteres
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Error al generar embedding');
      }

      const data = await response.json();
      return data.data[0]?.embedding || [];
    } catch (error: any) {
      console.error('Error generando embedding:', error);
      throw new Error(`Error al generar embedding: ${error.message}`);
    }
  }

  /**
   * Genera embeddings para múltiples textos en batch
   */
  static async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key no está configurada.');
    }

    // OpenAI permite hasta 2048 inputs por request, pero limitamos a 100 para evitar problemas
    const batchSize = 100;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      try {
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: batch.map(text => text.substring(0, 8000)),
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || 'Error al generar embeddings');
        }

        const data = await response.json();
        const embeddings = data.data.map((item: any) => item.embedding);
        allEmbeddings.push(...embeddings);
      } catch (error: any) {
        console.error(`Error generando embeddings para batch ${i}:`, error);
        // Continuar con el siguiente batch
        throw error;
      }
    }

    return allEmbeddings;
  }
}

