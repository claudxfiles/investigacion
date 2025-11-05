'use client';

import { useState } from 'react';
import { Search, FileText, Loader2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { RAGService, DocumentChunk } from '@/lib/rag-service';
import { EmbeddingService } from '@/lib/embedding-service';
import { Document } from '@/types';

interface SemanticSearchProps {
  projectId: string;
}

interface SearchResultWithDoc extends DocumentChunk {
  document?: Document;
}

export function SemanticSearch({ projectId }: SemanticSearchProps) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResultWithDoc[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [error, setError] = useState('');
  const [expandedChunks, setExpandedChunks] = useState<Set<string>>(new Set());

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Por favor ingresa una consulta');
      return;
    }

    setSearching(true);
    setError('');
    setResults([]);
    setDocuments([]);

    try {
      // Inicializar servicio de embeddings
      const openaiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      if (!openaiKey) {
        throw new Error('OpenAI API key no configurada');
      }
      EmbeddingService.initialize(openaiKey);

      // Realizar búsqueda
      const searchResults = await RAGService.searchSimilar(query, projectId, 10, 0.75);

      if (searchResults.chunks.length === 0) {
        setError('No se encontraron resultados relevantes. Intenta con otra consulta.');
        return;
      }

      // Mapear documentos a chunks
      const documentsMap = new Map(searchResults.documents.map(doc => [doc.id, doc]));
      const chunksWithDocs = searchResults.chunks.map(chunk => ({
        ...chunk,
        document: documentsMap.get(chunk.document_id),
      }));

      setResults(chunksWithDocs);
      setDocuments(searchResults.documents);
    } catch (err: any) {
      console.error('Error en búsqueda:', err);
      setError(err.message || 'Error al realizar la búsqueda');
    } finally {
      setSearching(false);
    }
  };

  const toggleChunkExpansion = (chunkId: string) => {
    setExpandedChunks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chunkId)) {
        newSet.delete(chunkId);
      } else {
        newSet.add(chunkId);
      }
      return newSet;
    });
  };

  const highlightText = (text: string, query: string): string => {
    if (!query.trim()) return text;
    
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    let highlightedText = text;
    
    words.forEach(word => {
      const regex = new RegExp(`(${word})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-300 text-black px-1 rounded">$1</mark>');
    });
    
    return highlightedText;
  };

  const getSeverityColor = (similarity: number): string => {
    if (similarity >= 0.9) return 'text-green-400';
    if (similarity >= 0.85) return 'text-blue-400';
    if (similarity >= 0.8) return 'text-yellow-400';
    return 'text-slate-400';
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-2">🔍 Búsqueda Semántica</h2>
        <p className="text-slate-400 text-sm">
          Busca información específica en todos los documentos usando IA
        </p>
      </div>

      {/* Search Input */}
      <div className="mb-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Ej: ¿Cuáles son los principales riesgos identificados?"
              className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              disabled={searching}
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  setError('');
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700 rounded"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {searching ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Buscar
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              Resultados ({results.length})
            </h3>
            <div className="text-sm text-slate-400">
              {documents.length} documento{documents.length !== 1 ? 's' : ''} encontrado{documents.length !== 1 ? 's' : ''}
            </div>
          </div>

          {results.map((result) => {
            const isExpanded = expandedChunks.has(result.id);
            const truncatedText = result.chunk_text.length > 300 
              ? result.chunk_text.substring(0, 300) + '...' 
              : result.chunk_text;
            const displayText = isExpanded ? result.chunk_text : truncatedText;

            return (
              <div
                key={result.id}
                className="bg-slate-900 border border-slate-700 rounded-lg p-4 hover:border-blue-500/50 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-white truncate">
                        {result.document?.filename || 'Documento sin nombre'}
                      </h4>
                      <p className="text-sm text-slate-400">
                        Fragmento {result.chunk_index + 1} • {result.document?.file_type.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(result.similarity)} bg-slate-800`}>
                    {(result.similarity * 100).toFixed(1)}% relevante
                  </div>
                </div>

                {/* Content */}
                <div 
                  className="text-slate-300 text-sm leading-relaxed mb-3"
                  dangerouslySetInnerHTML={{ __html: highlightText(displayText, query) }}
                />

                {/* Expand/Collapse Button */}
                {result.chunk_text.length > 300 && (
                  <button
                    onClick={() => toggleChunkExpansion(result.id)}
                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Ver menos
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Ver más
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!searching && results.length === 0 && !error && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">
            Ingresa una consulta para buscar información en tus documentos
          </p>
          <p className="text-slate-500 text-sm mt-2">
            Ejemplos: "riesgos identificados", "conclusiones financieras", "recomendaciones"
          </p>
        </div>
      )}
    </div>
  );
}
