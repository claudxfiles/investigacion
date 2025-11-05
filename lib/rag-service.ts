/**
 * Servicio RAG (Retrieval Augmented Generation) para búsqueda semántica de documentos
 */

import { supabase } from './supabase';
import { EmbeddingsService } from './embeddings-service';
// DocumentProcessor se importa dinámicamente para evitar problemas de SSR

export interface RAGSearchResult {
  document_id: string;
  content: string;
  content_index: number;
  similarity: number;
  metadata: Record<string, unknown>;
}

export class RAGService {
  /**
   * Procesa un documento: extrae texto, crea chunks y genera embeddings
   */
  static async processDocumentForRAG(
    documentId: string,
    file: File,
    fileType: string
  ): Promise<{ extractedText: string; chunksCount: number }> {
    try {
      // Importar DocumentProcessor dinámicamente solo cuando sea necesario (evita problemas de SSR)
      const { DocumentProcessor } = await import('./document-processor');
      
      // 1. Extraer texto del documento
      const extractedText = await DocumentProcessor.processDocument(file, fileType);
      
      if (!extractedText || extractedText.trim().length < 50) {
        throw new Error('No se pudo extraer suficiente texto del documento');
      }

      // 2. Dividir en chunks
      const chunks = DocumentProcessor.chunkText(extractedText, 1000, 200);
      
      if (chunks.length === 0) {
        throw new Error('No se pudieron crear chunks del documento');
      }

      // 3. Generar embeddings para cada chunk
      const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key no configurada');
      }

      EmbeddingsService.initialize(apiKey);
      const embeddings = await EmbeddingsService.generateEmbeddings(chunks);

      // 4. Eliminar embeddings antiguos del documento
      await supabase
        .from('document_embeddings')
        .delete()
        .eq('document_id', documentId);

      // 5. Insertar nuevos embeddings
      // Supabase acepta arrays directamente para el tipo vector
      const embeddingsToInsert = chunks.map((chunk, index) => ({
        document_id: documentId,
        content: chunk,
        content_index: index,
        embedding: embeddings[index], // Array de números - Supabase lo convierte a vector
        metadata: {
          chunk_index: index,
          chunk_length: chunk.length,
        },
      }));

      const { error: insertError } = await supabase
        .from('document_embeddings')
        .insert(embeddingsToInsert);

      if (insertError) {
        throw new Error(`Error insertando embeddings: ${insertError.message}`);
      }

      // 6. Actualizar el documento con el texto extraído
      await supabase
        .from('documents')
        .update({
          extracted_text: extractedText,
          processing_status: 'completed',
          processed_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      return {
        extractedText,
        chunksCount: chunks.length,
      };
    } catch (error: any) {
      console.error('Error procesando documento para RAG:', error);
      
      // Marcar como fallido
      await supabase
        .from('documents')
        .update({
          processing_status: 'failed',
        })
        .eq('id', documentId);

      throw error;
    }
  }

  /**
   * Busca documentos similares usando búsqueda semántica
   */
  static async searchSimilarDocuments(
    query: string,
    documentIds?: string[],
    limit: number = 10,
    threshold: number = 0.7
  ): Promise<RAGSearchResult[]> {
    try {
      // 1. Generar embedding de la query
      const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key no configurada');
      }

      EmbeddingsService.initialize(apiKey);
      const queryEmbedding = await EmbeddingsService.generateEmbedding(query);

      // 2. Buscar documentos similares usando la función de Supabase
      // Supabase acepta arrays directamente para el tipo vector
      const { data, error } = await supabase.rpc('match_document_embeddings', {
        query_embedding: queryEmbedding, // Array de números
        match_threshold: threshold,
        match_count: limit,
        filter_document_ids: documentIds || null,
      });

      if (error) {
        throw new Error(`Error en búsqueda semántica: ${error.message}`);
      }

      return (data || []).map((item: any) => ({
        document_id: item.document_id,
        content: item.content,
        content_index: item.content_index,
        similarity: item.similarity,
        metadata: item.metadata || {},
      }));
    } catch (error: any) {
      console.error('Error en búsqueda RAG:', error);
      throw error;
    }
  }

  /**
   * Obtiene contexto relevante para una query usando RAG
   */
  static async getRelevantContext(
    query: string,
    documentIds: string[],
    maxChunks: number = 10
  ): Promise<string> {
    try {
      const results = await this.searchSimilarDocuments(query, documentIds, maxChunks, 0.6);
      
      if (results.length === 0) {
        return '';
      }

      // Combinar chunks relevantes ordenados por similitud
      const context = results
        .sort((a, b) => b.similarity - a.similarity)
        .map((result, idx) => `[Chunk ${idx + 1} del documento ${result.document_id}]\n${result.content}`)
        .join('\n\n---\n\n');

      return context;
    } catch (error: any) {
      console.error('Error obteniendo contexto RAG:', error);
      return '';
    }
  }

  /**
   * Elimina embeddings de un documento
   */
  static async deleteDocumentEmbeddings(documentId: string): Promise<void> {
    const { error } = await supabase
      .from('document_embeddings')
      .delete()
      .eq('document_id', documentId);

    if (error) {
      throw new Error(`Error eliminando embeddings: ${error.message}`);
    }
  }
}

