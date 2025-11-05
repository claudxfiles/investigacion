'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Brain } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Project, Document } from '@/types';
import { AIService } from '@/lib/ai-service';
import { getTemplateForReportType } from '@/lib/templates';

interface ReportGeneratorProps {
  project: Project;
  documents: Document[];
  onClose: () => void;
  onSuccess: () => void;
}

export function ReportGenerator({ project, documents, onClose, onSuccess }: ReportGeneratorProps) {
  const [title, setTitle] = useState(`${project.name} - Informe de Análisis`);
  const [reportType, setReportType] = useState<'executive' | 'technical' | 'compliance' | 'financial'>(
    project.type === 'financial' ? 'financial' : 'executive'
  );
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [useAI, setUseAI] = useState(true);
  const [aiAvailable, setAiAvailable] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (apiKey) {
      AIService.initialize(apiKey);
      setAiAvailable(true);
    } else {
      setUseAI(false);
      setAiAvailable(false);
    }
  }, []);

  const generateReport = async () => {
    if (!user) return;

    setGenerating(true);
    setError('');

    try {
      // Usar todos los documentos, o al menos los completados si hay
      const completedDocs = documents.filter(d => d.processing_status === 'completed');
      const docsToUse = completedDocs.length > 0 ? completedDocs : documents;

      let reportData;

      if (useAI && aiAvailable && docsToUse.length > 0) {
        try {
          const aiResult = await AIService.generateReport({
            project,
            documents: docsToUse,
            reportType,
          });

          reportData = {
            executive_summary: aiResult.executiveSummary,
            document_analysis: aiResult.documentAnalysis,
            key_findings: aiResult.keyFindings,
            conclusions: aiResult.conclusions,
            recommendations: aiResult.recommendations,
          };
        } catch (aiError) {
          console.warn('Error en generación IA, usando generación básica:', aiError);
          reportData = generateBasicReport(docsToUse, project, reportType);
        }
      } else {
        reportData = generateBasicReport(docsToUse, project, reportType);
      }

      const { error: insertError } = await supabase
        .from('reports')
        .insert({
          project_id: project.id,
          title,
          report_type: reportType,
          executive_summary: reportData.executive_summary,
          document_analysis: reportData.document_analysis,
          key_findings: reportData.key_findings,
          conclusions: reportData.conclusions,
          recommendations: reportData.recommendations,
          generated_by: user.id,
        });

      if (insertError) throw insertError;

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al generar el informe');
    } finally {
      setGenerating(false);
    }
  };

  const generateBasicReport = (docs: Document[], proj: Project, rType: 'executive' | 'technical' | 'compliance' | 'financial') => {
    const reportTypeMap: Record<string, string> = {
      'executive': 'ejecutivo',
      'technical': 'técnico',
      'compliance': 'de cumplimiento',
      'financial': 'financiero',
    };

    // Si no hay documentos, generar informe inicial del proyecto
    if (docs.length === 0) {
      return {
        executive_summary: `Este informe ${reportTypeMap[rType] || 'ejecutivo'} proporciona un análisis inicial del proyecto ${proj.name}.\n\n${proj.description || 'El proyecto se encuentra en fase inicial de recopilación de documentación. Se recomienda subir documentos relevantes para realizar un análisis más completo.'}`,
        document_analysis: [],
        key_findings: [
          {
            id: 'finding-1',
            title: 'Estado Inicial del Proyecto',
            description: `El proyecto ${proj.name} se encuentra en fase inicial. Se recomienda subir documentos para realizar un análisis más completo.`,
            severity: 'low' as const,
            document_references: [],
          },
        ],
        conclusions: `El proyecto ${proj.name} está en desarrollo. Para un análisis más completo, se recomienda subir documentos relevantes al proyecto.`,
        recommendations: [
          {
            id: 'rec-1',
            title: 'Recopilación de Documentación',
            description: 'Subir documentos relevantes al proyecto para permitir un análisis más detallado.',
            priority: 'high' as const,
            actionable_steps: [
              'Identificar documentos clave relacionados con el proyecto',
              'Subir documentos en formato PDF, Word o imágenes',
              'Añadir descripciones y contexto a cada documento',
              'Generar un nuevo informe después de subir documentos',
            ],
          },
        ],
      };
    }

    // Extraer contenido real de los documentos con prioridad
    const extractContent = (doc: Document) => {
      // Prioridad 1: extracted_text (contenido real del documento)
      if (doc.extracted_text && doc.extracted_text.trim().length > 50) {
        return {
          source: 'extracted_text',
          content: doc.extracted_text.trim(),
          hasRealContent: true
        };
      }
      // Prioridad 2: description (si tiene suficiente contenido)
      if (doc.description && doc.description.trim().length > 20) {
        return {
          source: 'description',
          content: doc.description.trim(),
          hasRealContent: doc.description.trim().length > 100
        };
      }
      return null;
    };

    // Analizar contenido de todos los documentos
    const documentContents = docs
      .map(doc => ({
        doc,
        content: extractContent(doc)
      }))
      .filter(item => item.content !== null);

    const allContent = documentContents
      .map(item => item.content!.content)
      .join('\n\n');

    const hasRealContent = documentContents.some(item => item.content!.hasRealContent);

    // Generar resumen ejecutivo basado en el contenido real
    const generateExecutiveSummary = () => {
      if (!hasRealContent || allContent.length < 50) {
        return `Este informe ${reportTypeMap[rType] || 'ejecutivo'} analiza ${docs.length} documento${docs.length > 1 ? 's' : ''} del proyecto "${proj.name}".\n\n${proj.description ? `Contexto del proyecto: ${proj.description}\n\n` : ''}Los documentos proporcionados no contienen suficiente contenido textual extraído para realizar un análisis profundo. Se recomienda procesar los documentos para extraer su contenido completo o añadir descripciones detalladas.`;
      }

      // Analizar el contenido de manera más inteligente
      const contentText = allContent;
      
      // Extraer párrafos completos
      const paragraphs = contentText.split(/\n\s*\n|\.\s+(?=[A-Z])/).filter(p => p.trim().length > 50);
      
      // Extraer oraciones clave
      const sentences = contentText.split(/[.!?]+/).filter(s => s.trim().length > 30);
      
      // Identificar párrafos más relevantes (los más largos y con más información)
      const relevantParagraphs = paragraphs
        .sort((a, b) => b.length - a.length)
        .slice(0, 3)
        .map(p => p.trim().substring(0, 200));

      // Construir resumen ejecutivo
      let summary = `Este informe ${reportTypeMap[rType] || 'ejecutivo'} presenta un análisis exhaustivo de ${docs.length} documento${docs.length > 1 ? 's' : ''} del proyecto "${proj.name}".\n\n`;
      
      if (proj.description) {
        summary += `Contexto del Proyecto:\n${proj.description}\n\n`;
      }

      if (relevantParagraphs.length > 0) {
        summary += `Resumen del Contenido:\n`;
        relevantParagraphs.forEach((para, idx) => {
          summary += `${para}${para.length >= 200 ? '...' : ''}\n\n`;
        });
      } else if (sentences.length > 0) {
        summary += `Puntos Clave Identificados:\n`;
        sentences.slice(0, 5).forEach((sentence, idx) => {
          summary += `• ${sentence.trim()}.\n`;
        });
      }

      return summary.trim();
    };

    // Generar análisis de documentos basado en contenido real
    const generateDocumentAnalysis = () => {
      return docs.map((doc, idx) => {
        const contentData = extractContent(doc);
        const filename = doc.filename;
        const fileType = doc.file_type.toUpperCase();
        const fileSize = (doc.file_size / 1024).toFixed(2);
        
        if (contentData && contentData.hasRealContent) {
          const content = contentData.content;
          
          // Extraer párrafos completos
          const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 30);
          
          // Si hay párrafos, usar los más relevantes
          if (paragraphs.length > 0) {
            const relevantContent = paragraphs.slice(0, 2).map(p => p.trim().substring(0, 250)).join('\n\n');
            return {
              id: `analysis-${idx + 1}`,
              title: `Análisis de Documento ${idx + 1}: ${filename}`,
              content: `Contenido del documento:\n\n${relevantContent}${content.length > 500 ? '...' : ''}`,
              document_references: [doc.id],
            };
          } else {
            // Si no hay párrafos claros, usar las primeras líneas significativas
            const lines = content.split('\n').filter(l => l.trim().length > 20);
            const preview = lines.slice(0, 8).join('\n').substring(0, 400);
            return {
              id: `analysis-${idx + 1}`,
              title: `Análisis de Documento ${idx + 1}: ${filename}`,
              content: `Contenido del documento:\n\n${preview}${content.length > 400 ? '...' : ''}`,
              document_references: [doc.id],
            };
          }
        } else if (contentData) {
          // Tiene contenido pero es muy corto (solo description)
          return {
            id: `analysis-${idx + 1}`,
            title: `Análisis de Documento ${idx + 1}: ${filename}`,
            content: `Documento: ${filename} (${fileType}, ${fileSize} KB)\n\nDescripción proporcionada: ${contentData.content}\n\nNota: Este documento no contiene texto extraído. Se recomienda procesar el documento para extraer su contenido completo.`,
            document_references: [doc.id],
          };
        } else {
          return {
            id: `analysis-${idx + 1}`,
            title: `Análisis de Documento ${idx + 1}: ${filename}`,
            content: `Documento: ${filename} (${fileType}, ${fileSize} KB)\n\nEste documento no contiene texto extraído ni descripción disponible. Para realizar un análisis completo, es necesario procesar el documento para extraer su contenido textual o añadir una descripción manual.`,
            document_references: [doc.id],
          };
        }
      });
    };

    // Generar hallazgos basados en el contenido
    const generateKeyFindings = () => {
      const findings: any[] = [];
      
      if (hasRealContent && allContent.length > 100) {
        // Extraer conceptos y temas de manera más inteligente
        const text = allContent.toLowerCase();
        
        // Palabras comunes a filtrar (stop words en español)
        const stopWords = new Set(['este', 'esta', 'estos', 'estas', 'para', 'porque', 'cuando', 'donde', 'como', 'sobre', 'desde', 'hasta', 'entre', 'durante', 'mediante', 'según', 'contra', 'hacia', 'hasta', 'ante', 'bajo', 'cabe', 'con', 'de', 'desde', 'durante', 'en', 'entre', 'hacia', 'hasta', 'mediante', 'para', 'por', 'según', 'sin', 'sobre', 'tras', 'versus', 'vía', 'que', 'quien', 'cual', 'cuales', 'cuando', 'cuanto', 'donde', 'como', 'porque', 'aunque', 'mientras', 'si', 'sino', 'pero', 'mas', 'y', 'o', 'u', 'ni', 'no', 'también', 'tampoco', 'solo', 'solamente', 'aún', 'todavía', 'ya', 'ahora', 'entonces', 'luego', 'después', 'antes', 'hoy', 'ayer', 'mañana', 'siempre', 'nunca', 'a veces', 'mucho', 'poco', 'más', 'menos', 'muy', 'bastante', 'demasiado', 'todo', 'todos', 'toda', 'todas', 'alguno', 'algunos', 'alguna', 'algunas', 'ninguno', 'ningunos', 'ninguna', 'ningunas', 'otro', 'otros', 'otra', 'otras', 'mismo', 'mismos', 'misma', 'mismas', 'cada', 'cualquier', 'cualesquiera', 'tan', 'tanto', 'tanta', 'tantos', 'tantas']);
        
        // Extraer palabras significativas (más de 4 letras, no stop words)
        const words = text
          .replace(/[^\w\sáéíóúñü]/g, ' ')
          .split(/\s+/)
          .filter(w => w.length > 4 && !stopWords.has(w));
        
        const wordFreq: Record<string, number> = {};
        words.forEach(word => {
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        });
        
        // Obtener las 5-7 palabras más frecuentes
        const topWords = Object.entries(wordFreq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 7)
          .filter(([word, count]) => count >= 2) // Solo palabras que aparecen al menos 2 veces
          .map(([word]) => word);

        if (topWords.length > 0) {
          findings.push({
            id: 'finding-1',
            title: 'Conceptos y Temas Relevantes',
            description: `El análisis del contenido revela los siguientes conceptos y temas principales: ${topWords.join(', ')}. Estos términos aparecen recurrentemente en la documentación, indicando su importancia central en el contexto del proyecto.`,
            severity: 'medium' as const,
            document_references: docs.map(d => d.id),
          });
        }

        // Identificar información específica si es posible
        const sentences = allContent.split(/[.!?]+/).filter(s => s.trim().length > 40);
        if (sentences.length > 3) {
          findings.push({
            id: 'finding-2',
            title: 'Contenido Sustancial Disponible',
            description: `Los documentos analizados contienen información textual completa y estructurada. Se identificaron múltiples secciones y conceptos relevantes que permiten un análisis detallado del proyecto.`,
            severity: 'low' as const,
            document_references: docs.filter(d => extractContent(d)?.hasRealContent).map(d => d.id),
          });
        }
      } else {
        findings.push({
          id: 'finding-1',
          title: 'Contenido Limitado Disponible',
          description: `Los documentos proporcionados contienen información limitada o no se ha podido extraer su contenido completo. Para un análisis más profundo, se recomienda procesar los documentos para extraer su contenido textual o añadir descripciones detalladas.`,
          severity: 'medium' as const,
          document_references: docs.map(d => d.id),
        });
      }

      return findings.length > 0 ? findings : [
        {
          id: 'finding-1',
          title: 'Revisión de Documentación',
          description: `Se han revisado ${docs.length} documento${docs.length > 1 ? 's' : ''} del proyecto. ${hasRealContent ? 'Los documentos contienen información disponible para análisis.' : 'Se requiere procesamiento adicional de los documentos.'}`,
          severity: 'medium' as const,
          document_references: docs.map(d => d.id),
        }
      ];
    };

    // Generar conclusiones basadas en el contenido
    const generateConclusions = () => {
      if (!hasRealContent || allContent.length < 100) {
        return `El análisis de ${docs.length} documento${docs.length > 1 ? 's' : ''} del proyecto "${proj.name}" muestra que ${proj.description || 'los documentos no contienen suficiente contenido textual extraído para realizar un análisis completo'}. Para obtener insights más profundos, se recomienda procesar los documentos para extraer su contenido completo o utilizar herramientas de análisis con IA.`;
      }

      // Extraer conclusiones más específicas del contenido
      const paragraphs = allContent.split(/\n\s*\n/).filter(p => p.trim().length > 50);
      const summaryParagraph = paragraphs.length > 0 
        ? paragraphs[0].substring(0, 200) 
        : allContent.substring(0, 200);

      return `Basado en el análisis exhaustivo de ${docs.length} documento${docs.length > 1 ? 's' : ''} del proyecto "${proj.name}", ${proj.description ? `en el contexto de ${proj.description}, ` : ''}se han identificado elementos y patrones relevantes en la documentación. ${summaryParagraph}${allContent.length > 200 ? '...' : ''}\n\nSe recomienda realizar un análisis más profundo utilizando herramientas de IA para obtener insights específicos y detallados sobre el contenido de los documentos.`;
    };

    // Generar recomendaciones prácticas
    const generateRecommendations = () => {
      const recommendations: any[] = [];

      if (allContent.length === 0) {
        recommendations.push({
          id: 'rec-1',
          title: 'Procesamiento de Documentos',
          description: 'Algunos documentos no contienen texto extraído. Se recomienda procesar los documentos para extraer su contenido textual.',
          priority: 'high' as const,
          actionable_steps: [
            'Verificar que los documentos contengan texto extraíble',
            'Procesar documentos PDF o imágenes con OCR si es necesario',
            'Añadir descripciones manuales cuando el contenido no sea extraíble',
          ],
        });
      } else {
        recommendations.push({
          id: 'rec-1',
          title: 'Análisis Profundo',
          description: 'Se recomienda realizar un análisis más detallado de los documentos utilizando herramientas de IA para obtener insights más específicos.',
          priority: 'medium' as const,
          actionable_steps: [
            'Habilitar el análisis con IA para obtener insights más profundos',
            'Revisar los hallazgos identificados en los documentos',
            'Considerar la incorporación de documentos adicionales si es necesario',
          ],
        });
      }

      return recommendations;
    };
    
    return {
      executive_summary: generateExecutiveSummary(),
      document_analysis: generateDocumentAnalysis(),
      key_findings: generateKeyFindings(),
      conclusions: generateConclusions(),
      recommendations: generateRecommendations(),
    };
  };

  const reportTypeLabels: Record<string, string> = {
    'executive': 'Ejecutivo',
    'technical': 'Técnico',
    'compliance': 'Cumplimiento',
    'financial': 'Financiero',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-xl max-w-2xl w-full border border-slate-700">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <Sparkles className="w-6 h-6 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Generar Informe de Análisis</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
            <p className="text-blue-400 text-sm">
              {documents.length === 0 ? (
                <>Este informe generará un análisis inicial del proyecto <strong>{project.name}</strong>. Para un análisis más completo, se recomienda subir documentos primero.</>
              ) : (
                <>Este informe analizará {documents.filter(d => d.processing_status === 'completed').length} documento{documents.filter(d => d.processing_status === 'completed').length !== 1 ? 's' : ''} procesado{documents.filter(d => d.processing_status === 'completed').length !== 1 ? 's' : ''} y generará un informe profesional completo con resumen ejecutivo, hallazgos y recomendaciones.</>
              )}
            </p>
          </div>

          {aiAvailable && (
            <div className="bg-purple-500/10 border border-purple-500/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Brain className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-purple-400 font-medium text-sm">Análisis con IA Disponible</p>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useAI}
                        onChange={(e) => setUseAI(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  <p className="text-purple-300 text-xs">
                    {useAI 
                      ? 'La IA analizará el contenido de los documentos y generará insights inteligentes, hallazgos y recomendaciones.'
                      : 'Usando generación básica basada en plantillas.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!aiAvailable && (
            <div className="bg-amber-500/10 border border-amber-500/50 rounded-lg p-4">
              <p className="text-amber-400 text-sm">
                <strong>Nota:</strong> El análisis con IA no está disponible. Establece NEXT_PUBLIC_OPENAI_API_KEY en tus variables de entorno para habilitar la generación inteligente de informes.
              </p>
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-2">
              Título del Informe
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Tipo de Informe
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['executive', 'technical', 'compliance', 'financial'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setReportType(type)}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    reportType === type
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {reportTypeLabels[type]}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-slate-300">El informe incluirá:</p>
            <ul className="text-sm text-slate-400 space-y-1 ml-4">
              {getTemplateForReportType(reportType).structure.map((section, idx) => (
                <li key={idx}>• {section}</li>
              ))}
              <li className="text-slate-500 mt-2">• Apéndice de Documentos</li>
            </ul>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-700">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={generating}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={generateReport}
              disabled={generating}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generar Informe
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

