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
      console.log(`\n╔════════════════════════════════════════════════════════════════════╗`);
      console.log(`║              🔍 RAG SERVICE - BÚSQUEDA DETALLADA                   ║`);
      console.log(`╚════════════════════════════════════════════════════════════════════╝`);
      console.log(`📋 Query: "${query.substring(0, 100)}..."`);
      console.log(`🆔 Project ID: ${projectId}`);
      console.log(`📊 Threshold: ${threshold}`);
      console.log(`🔢 Limit: ${limit}`);
      
      // Primero, verificar cuántos embeddings existen en el proyecto
      const { count: totalEmbeddings, error: countError } = await supabase
        .from('document_embeddings')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);
      
      console.log(`📦 Total embeddings en proyecto: ${totalEmbeddings || 0}`);
      
      if (countError) {
        console.error(`❌ Error al contar embeddings:`, countError);
      }
      
      if (!totalEmbeddings || totalEmbeddings === 0) {
        console.warn(`⚠️ NO hay embeddings en la base de datos para este proyecto`);
        return {
          chunks: [],
          documents: [],
          context: '',
        };
      }

      // Generar embedding para la query
      console.log(`⏳ Generando embedding para la query...`);
      const queryEmbedding = await EmbeddingService.generateEmbedding(query);
      console.log(`✅ Embedding generado: ${queryEmbedding.embedding.length} dimensiones`);
      console.log(`📝 Tokens usados: ${queryEmbedding.tokens}`);

      // Buscar chunks similares usando la función de Supabase
      console.log(`⏳ Llamando a RPC match_documents...`);
      const { data: matches, error } = await supabase.rpc('match_documents', {
        query_embedding: queryEmbedding.embedding,
        match_threshold: threshold,
        match_count: limit,
        filter_project_id: projectId,
      });

      if (error) {
        console.error(`❌ Error en RPC match_documents:`, error);
        console.error(`   Código: ${error.code}`);
        console.error(`   Mensaje: ${error.message}`);
        console.error(`   Detalles: ${error.details}`);
        console.error(`   Hint: ${error.hint}`);
        throw error;
      }

      console.log(`📊 RPC retornó: ${matches ? matches.length : 0} matches`);
      
      if (!matches || matches.length === 0) {
        console.warn(`⚠️ NO se encontraron matches con threshold ${threshold}`);
        console.warn(`💡 Intentando query directa sin RPC para diagnosticar...`);
        
        // Query de diagnóstico: obtener algunos embeddings para verificar
        const { data: sampleEmbeddings, error: sampleError } = await supabase
          .from('document_embeddings')
          .select('id, document_id, chunk_text, chunk_index')
          .eq('project_id', projectId)
          .limit(3);
        
        if (sampleError) {
          console.error(`❌ Error en query de diagnóstico:`, sampleError);
        } else if (sampleEmbeddings) {
          console.log(`🔍 Muestra de embeddings en DB (primeros 3):`);
          sampleEmbeddings.forEach((emb, idx) => {
            console.log(`   ${idx + 1}. ID: ${emb.id}, Doc: ${emb.document_id}, Chunk: ${emb.chunk_index}`);
            console.log(`      Texto: "${emb.chunk_text.substring(0, 100)}..."`);
          });
        }
        
        console.log(`╚════════════════════════════════════════════════════════════════════╝\n`);
        
        return {
          chunks: [],
          documents: [],
          context: '',
        };
      }
      
      console.log(`✅ Encontrados ${matches.length} chunks relevantes!`);
      if (matches.length > 0) {
        console.log(`📊 Mejor similitud: ${matches[0].similarity.toFixed(4)}`);
        console.log(`📊 Peor similitud: ${matches[matches.length - 1].similarity.toFixed(4)}`);
      }

      // Obtener IDs únicos de documentos
      const documentIds = [...new Set(matches.map((m: any) => m.document_id))];
      console.log(`📄 Documentos únicos encontrados: ${documentIds.length}`);
      console.log(`   IDs: ${documentIds.join(', ')}`);

      // Obtener información completa de los documentos
      console.log(`⏳ Obteniendo información de documentos...`);
      const { data: documents, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .in('id', documentIds);

      if (docsError) {
        console.error(`❌ Error al obtener documentos:`, docsError);
      } else {
        console.log(`✅ Documentos obtenidos: ${documents?.length || 0}`);
        if (documents) {
          documents.forEach(doc => {
            console.log(`   - ${doc.filename} (${doc.file_type})`);
          });
        }
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
      console.log(`📝 Construyendo contexto consolidado...`);
      const context = this.buildContext(chunks, documentsMap);
      console.log(`✅ Contexto construido: ${context.length} caracteres`);
      console.log(`╚════════════════════════════════════════════════════════════════════╝\n`);

      return {
        chunks,
        documents: documents || [],
        context,
      };
    } catch (error) {
      console.error('❌ [RAG Service] Error crítico en búsqueda de similitud:', error);
      if (error instanceof Error) {
        console.error(`   Mensaje: ${error.message}`);
        console.error(`   Stack: ${error.stack}`);
      }
      console.log(`╚════════════════════════════════════════════════════════════════════╝\n`);
      throw error;
    }
  }

  /**
   * Construye contexto consolidado a partir de chunks
   * NO incluye IDs de chunks para evitar contaminar el informe
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
        context += `\n\n═══════════════════════════════════════════════════════════\n`;
        context += `📄 Documento: ${document.filename} (${document.file_type.toUpperCase()})\n`;
        context += `═══════════════════════════════════════════════════════════\n`;
        
        // Ordenar chunks por índice
        docChunks.sort((a, b) => a.chunk_index - b.chunk_index);
        
        for (const chunk of docChunks) {
          // ⚠️ NO incluir IDs de chunks - solo el contenido real
          // Solo mostrar relevancia para contexto del AI
          context += `\n[Fragmento con ${(chunk.similarity * 100).toFixed(1)}% de relevancia]\n`;
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
