/**
 * Servicio RAG (Retrieval-Augmented Generation) para búsqueda semántica
 */

import { supabase } from './supabase';
import { EmbeddingService } from './embedding-service';
import { Document } from '@/types';

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_text: string;
  chunk_index: number;
  similarity: number;
  metadata: Record<string, any>;
}

export interface SearchResult {
  chunks: DocumentChunk[];
  documents: Document[];
  context: string;
}

export interface ProcessingResult {
  success: boolean;
  documentId: string;
  chunksCreated: number;
  error?: string;
}

export class RAGService {
  /**
   * Procesa un documento y genera embeddings para sus chunks
   */
  static async processDocument(
    documentId: string,
    projectId: string,
    extractedText: string,
    metadata: Record<string, any> = {}
  ): Promise<ProcessingResult> {
    try {
      if (!extractedText || extractedText.trim().length === 0) {
        return {
          success: false,
          documentId,
          chunksCreated: 0,
          error: 'No text to process',
        };
      }

      // Dividir texto en chunks
      const chunks = EmbeddingService.chunkText(extractedText, 1000, 200);
      
      if (chunks.length === 0) {
        return {
          success: false,
          documentId,
          chunksCreated: 0,
          error: 'No chunks generated',
        };
      }

      console.log(`Processing document ${documentId}: ${chunks.length} chunks`);

      // Generar embeddings para todos los chunks
      const embeddings = await EmbeddingService.generateEmbeddings(chunks);

      // Preparar datos para insertar
      const embeddingsData = embeddings.map((result, index) => ({
        document_id: documentId,
        project_id: projectId,
        chunk_text: result.text,
        chunk_index: index,
        embedding: result.embedding,
        metadata: {
          ...metadata,
          tokens: result.tokens,
          chunk_length: result.text.length,
        },
      }));

      // Insertar embeddings en la base de datos
      const { error } = await supabase
        .from('document_embeddings')
        .insert(embeddingsData);

      if (error) {
        console.error('Error inserting embeddings:', error);
        throw error;
      }

      console.log(`Successfully processed document ${documentId}: ${chunks.length} chunks created`);

      return {
        success: true,
        documentId,
        chunksCreated: chunks.length,
      };
    } catch (error) {
      console.error('Error processing document:', error);
      return {
        success: false,
        documentId,
        chunksCreated: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Busca documentos similares usando búsqueda vectorial
   */
  static async searchSimilar(
    query: string,
    projectId: string,
    limit: number = 10,
    threshold: number = 0.78
  ): Promise<SearchResult> {
    try {
      // Generar embedding para la query
      const queryEmbedding = await EmbeddingService.generateEmbedding(query);

      // Buscar chunks similares usando la función de Supabase
      const { data: matches, error } = await supabase.rpc('match_documents', {
        query_embedding: queryEmbedding.embedding,
        match_threshold: threshold,
        match_count: limit,
        filter_project_id: projectId,
      });

      if (error) {
        console.error('Error searching documents:', error);
        throw error;
      }

      if (!matches || matches.length === 0) {
        return {
          chunks: [],
          documents: [],
          context: '',
        };
      }

      // Obtener IDs únicos de documentos
      const documentIds = [...new Set(matches.map((m: any) => m.document_id))];

      // Obtener información completa de los documentos
      const { data: documents, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .in('id', documentIds);

      if (docsError) {
        console.error('Error fetching documents:', docsError);
      }

      // Crear mapa de documentos para fácil acceso
      const documentsMap = new Map(
        (documents || []).map(doc => [doc.id, doc])
      );

      // Formatear chunks con información del documento
      const chunks: DocumentChunk[] = matches.map((match: any) => ({
        id: match.id,
        document_id: match.document_id,
        chunk_text: match.chunk_text,
        chunk_index: match.chunk_index,
        similarity: match.similarity,
        metadata: match.metadata,
      }));

      // Generar contexto consolidado
      const context = this.buildContext(chunks, documentsMap);

      return {
        chunks,
        documents: documents || [],
        context,
      };
    } catch (error) {
      console.error('Error in similarity search:', error);
      throw error;
    }
  }

  /**
   * Construye contexto consolidado a partir de chunks
   */
  private static buildContext(
    chunks: DocumentChunk[],
    documentsMap: Map<string, Document>
  ): string {
    let context = '';

    // Agrupar chunks por documento
    const chunksByDocument = new Map<string, DocumentChunk[]>();
    
    for (const chunk of chunks) {
      if (!chunksByDocument.has(chunk.document_id)) {
        chunksByDocument.set(chunk.document_id, []);
      }
      chunksByDocument.get(chunk.document_id)!.push(chunk);
    }

    // Construir contexto por documento
    for (const [documentId, docChunks] of chunksByDocument.entries()) {
      const document = documentsMap.get(documentId);
      
      if (document) {
        context += `\n\n--- Documento: ${document.filename} ---\n`;
        
        // Ordenar chunks por índice
        docChunks.sort((a, b) => a.chunk_index - b.chunk_index);
        
        for (const chunk of docChunks) {
          context += `\n[Relevancia: ${(chunk.similarity * 100).toFixed(1)}%]\n`;
          context += chunk.chunk_text;
          context += '\n';
        }
      }
    }

    return context.trim();
  }

  /**
   * Elimina embeddings de un documento
   */
  static async deleteDocumentEmbeddings(documentId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('document_embeddings')
        .delete()
        .eq('document_id', documentId);

      if (error) {
        console.error('Error deleting embeddings:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteDocumentEmbeddings:', error);
      return false;
    }
  }

  /**
   * Cuenta el número de embeddings de un documento
   */
  static async countDocumentEmbeddings(documentId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('document_embeddings')
        .select('*', { count: 'exact', head: true })
        .eq('document_id', documentId);

      if (error) {
        console.error('Error counting embeddings:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in countDocumentEmbeddings:', error);
      return 0;
    }
  }

  /**
   * Obtiene estadísticas de embeddings de un proyecto
   */
  static async getProjectStats(projectId: string): Promise<{
    totalEmbeddings: number;
    totalDocuments: number;
    averageChunksPerDocument: number;
  }> {
    try {
      // Contar embeddings totales
      const { count: totalEmbeddings, error: embError } = await supabase
        .from('document_embeddings')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

      if (embError) {
        console.error('Error counting embeddings:', embError);
      }

      // Contar documentos únicos
      const { data: uniqueDocs, error: docsError } = await supabase
        .from('document_embeddings')
        .select('document_id')
        .eq('project_id', projectId);

      if (docsError) {
        console.error('Error counting documents:', docsError);
      }

      const uniqueDocIds = new Set(uniqueDocs?.map(d => d.document_id) || []);
      const totalDocuments = uniqueDocIds.size;

      return {
        totalEmbeddings: totalEmbeddings || 0,
        totalDocuments,
        averageChunksPerDocument: totalDocuments > 0 
          ? (totalEmbeddings || 0) / totalDocuments 
          : 0,
      };
    } catch (error) {
      console.error('Error getting project stats:', error);
      return {
        totalEmbeddings: 0,
        totalDocuments: 0,
        averageChunksPerDocument: 0,
      };
    }
  }

  /**
   * Reindexar un documento (eliminar embeddings antiguos y crear nuevos)
   */
  static async reindexDocument(
    documentId: string,
    projectId: string,
    extractedText: string,
    metadata: Record<string, any> = {}
  ): Promise<ProcessingResult> {
    // Eliminar embeddings existentes
    await this.deleteDocumentEmbeddings(documentId);
    
    // Crear nuevos embeddings
    return this.processDocument(documentId, projectId, extractedText, metadata);
  }
}
