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
    const template = getTemplateForReportType(rType);
    const reportTypeMap: Record<string, string> = {
      'executive': 'ejecutivo',
      'technical': 'técnico',
      'compliance': 'de cumplimiento',
      'financial': 'financiero',
    };

    const projectTypeMap: Record<string, string> = {
      'general': 'general',
      'financial': 'financiero',
      'legal': 'legal',
    };

    // Generar resumen ejecutivo basado en la plantilla
    const generateExecutiveSummary = () => {
      const sections = template.structure.map(section => {
        switch (section) {
          case 'Resumen Ejecutivo':
          case 'Resumen Técnico':
          case 'Resumen de Cumplimiento':
          case 'Resumen Financiero':
            return `Este informe ${reportTypeMap[rType] || 'ejecutivo'} proporciona un análisis completo siguiendo el formato ${template.style.toLowerCase()}. El análisis está dirigido a ${template.audience.toLowerCase()} y utiliza un ${template.tone.toLowerCase()}.`;
          case 'Metodología de Investigación':
          case 'Metodología Detallada':
            return `La metodología empleada incluye la revisión de ${docs.length} documento${docs.length > 1 ? 's' : ''} procesado${docs.length > 1 ? 's' : ''} para el proyecto ${proj.name}.`;
          case 'Hallazgos Principales':
          case 'Hallazgos de Cumplimiento / No Cumplimiento':
            return `Se identificaron hallazgos clave basados en el análisis de los documentos proporcionados.`;
          default:
            return '';
        }
      }).filter(s => s);

      return sections.join(' ') + ` ${proj.description || 'Este proyecto requiere análisis adicional mediante la incorporación de más documentación.'}`;
    };

    // Si no hay documentos, generar un informe básico del proyecto
    if (docs.length === 0) {
      const emptySummary = `Este informe ${reportTypeMap[rType] || 'ejecutivo'} proporciona un análisis inicial del proyecto ${proj.name} (tipo ${projectTypeMap[proj.type] || 'general'}). 

CONTEXTO: ${template.context}

OBJETIVO: ${template.objective}

El proyecto se encuentra en fase inicial de recopilación de documentación. ${proj.description || 'Se recomienda subir documentos relevantes para realizar un análisis más completo siguiendo la estructura de la plantilla.'}`;

      return {
        executive_summary: emptySummary,
        document_analysis: [],
        key_findings: [
          {
            id: 'finding-1',
            title: 'Estado Inicial del Proyecto',
            description: `El proyecto ${proj.name} se encuentra en fase inicial. Se recomienda subir documentos para realizar un análisis más completo siguiendo la metodología de ${template.structure.join(', ')}.`,
            severity: 'low' as const,
            document_references: [],
          },
        ],
        conclusions: `El proyecto ${proj.name} está en desarrollo. Para un análisis más completo siguiendo la estructura de ${template.structure.join(' → ')}, se recomienda subir documentos relevantes al proyecto.`,
        recommendations: [
          {
            id: 'rec-1',
            title: 'Recopilación de Documentación',
            description: `Subir documentos relevantes al proyecto para permitir un análisis más detallado siguiendo la plantilla de ${reportTypeMap[rType]}.`,
            priority: 'high' as const,
            actionable_steps: [
              'Identificar documentos clave relacionados con el proyecto',
              'Subir documentos en formato PDF, Word o imágenes',
              'Añadir descripciones y contexto a cada documento',
              `Generar un nuevo informe ${reportTypeMap[rType]} después de subir documentos`,
            ],
          },
        ],
      };
    }

    return {
      executive_summary: generateExecutiveSummary(),
      document_analysis: docs.map((doc, idx) => ({
        id: `analysis-${idx + 1}`,
        title: `Análisis de Documento ${idx + 1}: ${doc.filename}`,
        content: `Análisis de ${doc.filename} (${doc.file_type.toUpperCase()}, ${(doc.file_size / 1024).toFixed(2)} KB). ${doc.description || 'No se proporcionó contexto adicional.'} Este análisis sigue el ${template.style.toLowerCase()} y está dirigido a ${template.audience.toLowerCase()}.`,
        document_references: [doc.id],
      })),
      key_findings: [
        {
          id: 'finding-1',
          title: 'Completitud de la Colección de Documentos',
          description: `El proyecto contiene ${docs.length} documento${docs.length > 1 ? 's' : ''} procesado${docs.length > 1 ? 's' : ''} que cubren el alcance de los requisitos de análisis ${projectTypeMap[proj.type] || 'general'}. El análisis sigue la estructura: ${template.structure.join(' → ')}.`,
          severity: 'medium' as const,
          document_references: docs.map(d => d.id),
        },
      ],
      conclusions: `Basado en el análisis de ${docs.length} documento${docs.length > 1 ? 's' : ''} en el proyecto ${proj.name}, este informe ${reportTypeMap[rType]} identifica patrones clave, riesgos y oportunidades siguiendo el ${template.tone.toLowerCase()} requerido para ${template.audience.toLowerCase()}.`,
      recommendations: [
        {
          id: 'rec-1',
          title: 'Estándares de Documentación',
          description: `Mantener estándares de documentación consistentes siguiendo el ${template.style.toLowerCase()} requerido para este tipo de informe.`,
          priority: 'medium' as const,
          actionable_steps: [
            'Establecer convenciones de nomenclatura de documentos',
            'Implementar procedimientos de control de versiones',
            `Asegurar que la documentación cumpla con los estándares de ${template.audience.toLowerCase()}`,
          ],
        },
      ],
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

