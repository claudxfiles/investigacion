import { Document, Project } from '@/types';
import { ReportTemplates, getTemplateForReportType } from './templates';

interface AIPromptOptions {
  project: Project;
  documents: Document[];
  reportType: 'executive' | 'technical' | 'compliance' | 'financial';
}

export class AIService {
  private static apiKey: string;
  private static apiUrl: string = 'https://api.openai.com/v1/chat/completions';

  static initialize(apiKey: string) {
    this.apiKey = apiKey;
  }

  static async generateReport(options: AIPromptOptions): Promise<{
    executiveSummary: string;
    documentAnalysis: Array<{
      id: string;
      title: string;
      content: string;
      document_references: string[];
    }>;
    keyFindings: Array<{
      id: string;
      title: string;
      description: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      document_references: string[];
    }>;
    conclusions: string;
    recommendations: Array<{
      id: string;
      title: string;
      description: string;
      priority: 'low' | 'medium' | 'high';
      actionable_steps: string[];
    }>;
  }> {
    if (!this.apiKey) {
      throw new Error('La clave API de OpenAI no está configurada. Por favor, establece NEXT_PUBLIC_OPENAI_API_KEY en tus variables de entorno.');
    }

    // Preparar documentos para análisis
    let documentContexts = options.documents
      .filter(doc => doc.processing_status === 'completed')
      .map(doc => ({
        id: doc.id,
        filename: doc.filename,
        description: doc.description || '',
        type: doc.file_type,
        content: doc.extracted_text 
          ? doc.extracted_text.substring(0, 5000)
          : (doc.description || `Documento ${doc.filename} (${doc.file_type.toUpperCase()}, ${(doc.file_size / 1024).toFixed(2)} KB). ${doc.description ? doc.description : 'Sin contenido extraído disponible.'}`),
      }));

    // Si no hay documentos, usar generación básica
    if (documentContexts.length === 0 && options.documents.length === 0) {
      return this.generateBasicReport(options);
    }

    // Si hay documentos pero ninguno tiene texto extraído, usar información básica
    if (documentContexts.length === 0 && options.documents.length > 0) {
      documentContexts = options.documents.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        description: doc.description || '',
        type: doc.file_type,
        content: doc.description || `Documento ${doc.filename} (${doc.file_type.toUpperCase()}) sin contenido extraído.`,
      }));
    }

    const systemPrompt = this.getSystemPrompt(options.reportType, options.project.type);
    const userPrompt = this.getUserPrompt(options.project, documentContexts);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Error al generar el informe con IA');
      }

      const data = await response.json();
      const aiContent = data.choices[0]?.message?.content;

      if (!aiContent) {
        throw new Error('No se recibió contenido de la IA');
      }

      return this.parseAIResponse(aiContent);
    } catch (error) {
      console.error('Error en generación IA:', error);
      return this.generateBasicReport(options);
    }
  }

  private static getSystemPrompt(reportType: 'executive' | 'technical' | 'compliance' | 'financial', projectType: string): string {
    const template = getTemplateForReportType(reportType);
    const projectTypeMap: Record<string, string> = {
      'general': 'general',
      'financial': 'financiero',
      'legal': 'legal',
    };

    return `Eres un experto analista de documentos especializado en análisis ${projectTypeMap[projectType] || 'general'}. 

CONTEXTO DE LA PLANTILLA:
${template.context}

OBJETIVO:
${template.objective}

ESTILO REQUERIDO:
${template.style}

TONO REQUERIDO:
${template.tone}

PÚBLICO OBJETIVO:
${template.audience}

ESTRUCTURA DEL INFORME (en orden):
${template.structure.map((section, idx) => `${idx + 1}. ${section}`).join('\n')}

Genera tu respuesta como un objeto JSON con la siguiente estructura:
{
  "executive_summary": "Un resumen completo siguiendo la estructura de la plantilla. Debe incluir: ${template.structure.join(', ')}",
  "document_analysis": [
    {
      "title": "Título del análisis",
      "content": "Contenido detallado del análisis con referencias específicas...",
      "document_ids": ["doc-id-1", "doc-id-2"]
    }
  ],
  "key_findings": [
    {
      "title": "Título del hallazgo",
      "description": "Descripción detallada del hallazgo con evidencia...",
      "severity": "alta|media|baja|crítica",
      "document_ids": ["doc-id-1"]
    }
  ],
  "conclusions": "Conclusiones completas basadas en el análisis, siguiendo el ${template.tone} y estilo ${template.style}...",
  "recommendations": [
    {
      "title": "Título de la recomendación",
      "description": "Descripción detallada siguiendo el estilo de ${template.audience}...",
      "priority": "alta|media|baja",
      "actionable_steps": ["Paso 1", "Paso 2", "Paso 3"]
    }
  ]
}

IMPORTANTE: 
- TODA la respuesta debe estar en ESPAÑOL
- SIGUE ESTRICTAMENTE la estructura de la plantilla: ${template.structure.join(' → ')}
- Usa el ${template.tone} en todo el contenido
- El estilo debe ser ${template.style}
- Dirígete a ${template.audience}
- Sé específico y basado en evidencia
- Referencia contenido real de los documentos
- Usa niveles de severidad apropiados (crítica, alta, media, baja)
- Proporciona recomendaciones accionables
- Asegúrate de que todos los hallazgos sean rastreables a documentos fuente`;
  }

  private static getUserPrompt(project: Project, documents: Array<{ id: string; filename: string; description: string; type: string; content: string }>): string {
    return `Analiza los siguientes documentos para el proyecto "${project.name}" (tipo ${project.type}).

Descripción del Proyecto: ${project.description || 'No se proporcionó contexto adicional.'}

Documentos a analizar:
${documents.map((doc, idx) => `
Documento ${idx + 1} (ID: ${doc.id}):
- Nombre del archivo: ${doc.filename}
- Tipo: ${doc.type}
- Descripción: ${doc.description || 'Ninguna'}
- Vista previa del contenido:
${doc.content}
`).join('\n')}

Genera un informe completo de análisis ${project.type}. Enfócate en:
1. Insights y patrones clave en todos los documentos
2. Hallazgos críticos que requieren atención
3. Riesgos y oportunidades
4. Recomendaciones accionables con pasos específicos
5. Conclusiones basadas en evidencia

IMPORTANTE: Responde TODO en ESPAÑOL. Asegúrate de que todos los hallazgos referencien IDs de documentos específicos para trazabilidad.`;
  }

  private static parseAIResponse(aiContent: string): any {
    try {
      let jsonContent = aiContent;
      const jsonMatch = aiContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1];
      }

      const parsed = JSON.parse(jsonContent);

      return {
        executiveSummary: parsed.executive_summary || parsed.executiveSummary || '',
        documentAnalysis: (parsed.document_analysis || parsed.documentAnalysis || []).map((item: any, idx: number) => ({
          id: `analysis-${idx + 1}`,
          title: item.title || `Análisis de Documento ${idx + 1}`,
          content: item.content || '',
          document_references: item.document_ids || item.document_references || [],
        })),
        keyFindings: (parsed.key_findings || parsed.keyFindings || []).map((item: any, idx: number) => ({
          id: `finding-${idx + 1}`,
          title: item.title || `Hallazgo ${idx + 1}`,
          description: item.description || '',
          severity: this.normalizeSeverity(item.severity),
          document_references: item.document_ids || item.document_references || [],
        })),
        conclusions: parsed.conclusions || '',
        recommendations: (parsed.recommendations || []).map((item: any, idx: number) => ({
          id: `rec-${idx + 1}`,
          title: item.title || `Recomendación ${idx + 1}`,
          description: item.description || '',
          priority: this.normalizePriority(item.priority),
          actionable_steps: item.actionable_steps || item.actionableSteps || [],
        })),
      };
    } catch (error) {
      console.error('Error al parsear respuesta de IA:', error);
      throw new Error('Error al procesar la respuesta de la IA. Por favor, intenta de nuevo.');
    }
  }

  private static normalizeSeverity(severity: string): 'low' | 'medium' | 'high' | 'critical' {
    const s = severity?.toLowerCase() || 'medium';
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      'baja': 'low',
      'media': 'medium',
      'alta': 'high',
      'crítica': 'critical',
      'critical': 'critical',
      'high': 'high',
      'medium': 'medium',
      'low': 'low',
    };
    return severityMap[s] || 'medium';
  }

  private static normalizePriority(priority: string): 'low' | 'medium' | 'high' {
    const p = priority?.toLowerCase() || 'medium';
    const priorityMap: Record<string, 'low' | 'medium' | 'high'> = {
      'baja': 'low',
      'media': 'medium',
      'alta': 'high',
      'high': 'high',
      'medium': 'medium',
      'low': 'low',
    };
    return priorityMap[p] || 'medium';
  }

  private static generateBasicReport(options: AIPromptOptions): any {
    const completedDocs = options.documents.filter(d => d.processing_status === 'completed');
    const allDocs = options.documents.length > 0 ? options.documents : [];
    const docsToUse = completedDocs.length > 0 ? completedDocs : allDocs;
    
    const template = getTemplateForReportType(options.reportType);
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
            return `Este informe ${reportTypeMap[options.reportType] || 'ejecutivo'} proporciona un análisis completo siguiendo el formato ${template.style.toLowerCase()}. El análisis está dirigido a ${template.audience.toLowerCase()} y utiliza un ${template.tone.toLowerCase()}.`;
          case 'Metodología de Investigación':
          case 'Metodología Detallada':
            return `La metodología empleada incluye la revisión de ${docsToUse.length} documento${docsToUse.length > 1 ? 's' : ''} procesado${docsToUse.length > 1 ? 's' : ''} para el proyecto ${options.project.name}.`;
          case 'Hallazgos Principales':
          case 'Hallazgos de Cumplimiento / No Cumplimiento':
            return `Se identificaron hallazgos clave basados en el análisis de los documentos proporcionados.`;
          default:
            return '';
        }
      }).filter(s => s);

      return sections.join(' ') + ` ${options.project.description || 'Este proyecto requiere análisis adicional mediante la incorporación de más documentación.'}`;
    };

    // Si no hay documentos, generar informe inicial del proyecto
    if (docsToUse.length === 0) {
      const emptySummary = `Este informe ${reportTypeMap[options.reportType] || 'ejecutivo'} proporciona un análisis inicial del proyecto ${options.project.name} (tipo ${projectTypeMap[options.project.type] || 'general'}). 

CONTEXTO: ${template.context}

OBJETIVO: ${template.objective}

El proyecto se encuentra en fase inicial de recopilación de documentación. ${options.project.description || 'Se recomienda subir documentos relevantes para realizar un análisis más completo siguiendo la estructura de la plantilla.'}`;

      return {
        executiveSummary: emptySummary,
        documentAnalysis: [],
        keyFindings: [
          {
            id: 'finding-1',
            title: 'Estado Inicial del Proyecto',
            description: `El proyecto ${options.project.name} se encuentra en fase inicial. Se recomienda subir documentos para realizar un análisis más completo siguiendo la metodología de ${template.structure.join(', ')}.`,
            severity: 'low' as const,
            document_references: [],
          },
        ],
        conclusions: `El proyecto ${options.project.name} está en desarrollo. Para un análisis más completo siguiendo la estructura de ${template.structure.join(' → ')}, se recomienda subir documentos relevantes al proyecto.`,
        recommendations: [
          {
            id: 'rec-1',
            title: 'Recopilación de Documentación',
            description: `Subir documentos relevantes al proyecto para permitir un análisis más detallado siguiendo la plantilla de ${reportTypeMap[options.reportType]}.`,
            priority: 'high' as const,
            actionable_steps: [
              'Identificar documentos clave relacionados con el proyecto',
              'Subir documentos en formato PDF, Word o imágenes',
              'Añadir descripciones y contexto a cada documento',
              `Generar un nuevo informe ${reportTypeMap[options.reportType]} después de subir documentos`,
            ],
          },
        ],
      };
    }
    
    return {
      executiveSummary: generateExecutiveSummary(),
      documentAnalysis: docsToUse.map((doc, idx) => ({
        id: `analysis-${idx + 1}`,
        title: `Análisis de Documento ${idx + 1}: ${doc.filename}`,
        content: `Análisis de ${doc.filename} (${doc.file_type.toUpperCase()}, ${(doc.file_size / 1024).toFixed(2)} KB). ${doc.description || 'No se proporcionó contexto adicional.'} Este análisis sigue el ${template.style.toLowerCase()} y está dirigido a ${template.audience.toLowerCase()}.`,
        document_references: [doc.id],
      })),
      keyFindings: [
        {
          id: 'finding-1',
          title: 'Completitud de la Colección de Documentos',
          description: `El proyecto contiene ${docsToUse.length} documento${docsToUse.length > 1 ? 's' : ''} procesado${docsToUse.length > 1 ? 's' : ''} que cubren el alcance de los requisitos de análisis ${projectTypeMap[options.project.type] || 'general'}. El análisis sigue la estructura: ${template.structure.join(' → ')}.`,
          severity: 'medium' as const,
          document_references: docsToUse.map(d => d.id),
        },
      ],
      conclusions: `Basado en el análisis de ${docsToUse.length} documento${docsToUse.length > 1 ? 's' : ''} en el proyecto ${options.project.name}, este informe ${reportTypeMap[options.reportType]} identifica patrones clave, riesgos y oportunidades siguiendo el ${template.tone.toLowerCase()} requerido para ${template.audience.toLowerCase()}.`,
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
  }
}
