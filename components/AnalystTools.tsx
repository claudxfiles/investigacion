'use client';

import { useState } from 'react';
import { Sparkles, FileText, Brain, TrendingUp, Search, X } from 'lucide-react';
import { Document, Project } from '@/types';
import { AIService } from '@/lib/ai-service';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface AnalystToolsProps {
  project: Project;
  documents: Document[];
  onUpdate: () => void;
}

export function AnalystTools({ project, documents, onUpdate }: AnalystToolsProps) {
  const [showTools, setShowTools] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState('');
  const { user } = useAuth();

  const handleAnalyzeDocument = async (document: Document) => {
    setLoading(true);
    setError('');
    setResult('');

    try {
      const content = document.extracted_text || document.description || '';
      
      if (!content) {
        throw new Error('El documento no tiene contenido extraído. Por favor, edita el documento y añade texto extraído o descripción.');
      }

      const prompt = `Analiza el siguiente documento de investigación para casos de fraude y corrupción:

Título: ${document.filename}
Descripción: ${document.description || 'Sin descripción'}
Contenido: ${content.substring(0, 4000)}

Proporciona:
1. Un resumen ejecutivo del contenido
2. Hallazgos clave relevantes para investigación
3. Posibles indicios de irregularidades
4. Recomendaciones para el análisis`;

      const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('La API de OpenAI no está configurada');
      }

      AIService.initialize(apiKey);
      
      // Usar el servicio de IA para análisis
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
              role: 'system',
              content: 'Eres un analista experto en investigación de fraudes y corrupción. Analiza documentos y proporciona insights relevantes para casos fiscales.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al generar análisis');
      }

      const data = await response.json();
      const analysis = data.choices[0].message.content;
      
      setResult(analysis);
    } catch (err: any) {
      setError(err.message || 'Error al analizar el documento');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    setLoading(true);
    setError('');
    setResult('');

    try {
      const completedDocs = documents.filter(d => d.processing_status === 'completed');
      
      if (completedDocs.length === 0) {
        throw new Error('No hay documentos completados para analizar');
      }

      const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('La API de OpenAI no está configurada');
      }

      const documentsContent = completedDocs.map(doc => ({
        nombre: doc.filename,
        descripcion: doc.description,
        contenido: doc.extracted_text || doc.description || '',
      }));

      const prompt = `Genera un resumen ejecutivo del proyecto "${project.name}" basado en los siguientes documentos:

${documentsContent.map((doc, idx) => `
Documento ${idx + 1}: ${doc.nombre}
Descripción: ${doc.descripcion}
Contenido: ${doc.contenido.substring(0, 2000)}
`).join('\n---\n')}

Proporciona:
1. Resumen ejecutivo del proyecto
2. Documentos clave identificados
3. Temas principales encontrados
4. Próximos pasos recomendados`;

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
              role: 'system',
              content: 'Eres un analista experto que genera resúmenes ejecutivos de proyectos de investigación.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al generar resumen');
      }

      const data = await response.json();
      const summary = data.choices[0].message.content;
      
      setResult(summary);
    } catch (err: any) {
      setError(err.message || 'Error al generar resumen');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchDocuments = async (query: string) => {
    setLoading(true);
    setError('');
    setResult('');

    try {
      const matchingDocs = documents.filter(doc => {
        const searchText = `${doc.filename} ${doc.description} ${doc.extracted_text}`.toLowerCase();
        return searchText.includes(query.toLowerCase());
      });

      if (matchingDocs.length === 0) {
        setResult(`No se encontraron documentos que coincidan con "${query}"`);
        return;
      }

      const resultText = `Encontrados ${matchingDocs.length} documento(s) que coinciden con "${query}":\n\n${matchingDocs.map((doc, idx) => `
${idx + 1}. ${doc.filename}
   Descripción: ${doc.description || 'Sin descripción'}
   Estado: ${doc.processing_status}
   ${doc.extracted_text ? `Contenido relevante: ${doc.extracted_text.substring(0, 200)}...` : ''}
`).join('\n')}`;

      setResult(resultText);
    } catch (err: any) {
      setError(err.message || 'Error en la búsqueda');
    } finally {
      setLoading(false);
    }
  };

  if (!showTools) {
    return (
      <button
        onClick={() => setShowTools(true)}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
      >
        <Sparkles className="w-5 h-5" />
        Herramientas de Análisis
      </button>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-600/20 rounded-lg">
            <Brain className="w-6 h-6 text-purple-400" />
          </div>
          <h3 className="text-xl font-bold text-white">Herramientas de Análisis</h3>
        </div>
        <button
          onClick={() => {
            setShowTools(false);
            setSelectedTool(null);
            setResult('');
            setError('');
          }}
          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => setSelectedTool('analyze')}
          className={`p-4 rounded-lg border-2 transition-all text-left ${
            selectedTool === 'analyze'
              ? 'border-purple-500 bg-purple-500/10'
              : 'border-slate-700 hover:border-slate-600'
          }`}
        >
          <FileText className="w-6 h-6 text-purple-400 mb-2" />
          <h4 className="text-white font-semibold mb-1">Analizar Documento</h4>
          <p className="text-slate-400 text-sm">Análisis detallado con IA de un documento específico</p>
        </button>

        <button
          onClick={() => setSelectedTool('summary')}
          className={`p-4 rounded-lg border-2 transition-all text-left ${
            selectedTool === 'summary'
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-slate-700 hover:border-slate-600'
          }`}
        >
          <TrendingUp className="w-6 h-6 text-blue-400 mb-2" />
          <h4 className="text-white font-semibold mb-1">Resumen del Proyecto</h4>
          <p className="text-slate-400 text-sm">Genera un resumen ejecutivo de todos los documentos</p>
        </button>

        <button
          onClick={() => setSelectedTool('search')}
          className={`p-4 rounded-lg border-2 transition-all text-left ${
            selectedTool === 'search'
              ? 'border-green-500 bg-green-500/10'
              : 'border-slate-700 hover:border-slate-600'
          }`}
        >
          <Search className="w-6 h-6 text-green-400 mb-2" />
          <h4 className="text-white font-semibold mb-1">Buscar Documentos</h4>
          <p className="text-slate-400 text-sm">Busca contenido en todos los documentos</p>
        </button>
      </div>

      {/* Panel de herramientas */}
      {selectedTool === 'analyze' && (
        <div className="space-y-4">
          <h4 className="text-white font-semibold">Selecciona un documento para analizar:</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => handleAnalyzeDocument(doc)}
                disabled={loading}
                className="w-full text-left p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">{doc.filename}</span>
                  {loading && <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedTool === 'summary' && (
        <div className="space-y-4">
          <p className="text-slate-400">Genera un resumen ejecutivo de todos los documentos del proyecto.</p>
          <button
            onClick={handleGenerateSummary}
            disabled={loading || documents.length === 0}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generando resumen...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generar Resumen Ejecutivo
              </>
            )}
          </button>
        </div>
      )}

      {selectedTool === 'search' && (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Buscar en documentos..."
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearchDocuments(e.currentTarget.value);
              }
            }}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={() => {
              const input = document.querySelector('input[placeholder="Buscar en documentos..."]') as HTMLInputElement;
              if (input) handleSearchDocuments(input.value);
            }}
            disabled={loading}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      )}

      {/* Resultados */}
      {result && (
        <div className="mt-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
          <h4 className="text-white font-semibold mb-2">Resultado:</h4>
          <div className="text-slate-300 whitespace-pre-wrap text-sm max-h-96 overflow-y-auto">
            {result}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/50 text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
}

