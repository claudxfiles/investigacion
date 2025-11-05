import { Document, Project } from '@/types';
import { ReportTemplates, getTemplateForReportType } from './templates';
import { RAGService } from './rag-service';

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
      return await this.generateBasicReport(options);
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
    const userPrompt = await this.getUserPrompt(options.project, documentContexts);

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
      return await this.generateBasicReport(options);
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

  private static async getUserPrompt(
    project: Project, 
    documents: Array<{ id: string; filename: string; description: string; type: string; content: string }>
  ): Promise<string> {
    // Usar RAG para obtener contexto relevante
    const documentIds = documents.map(doc => doc.id);
    
    // Generar queries para buscar contexto relevante
    const queries = [
      `información principal y hallazgos clave en ${project.name}`,
      `datos importantes y conclusiones en ${project.name}`,
      `análisis y recomendaciones en ${project.name}`,
    ];

    let ragContext = '';
    try {
      const ragResults = await Promise.all(
        queries.map(query => 
          RAGService.getRelevantContext(query, documentIds, 5)
        )
      );
      
      const uniqueContext = [...new Set(ragResults.filter(ctx => ctx.length > 0))].join('\n\n');
      if (uniqueContext.length > 0) {
        ragContext = `\n\nCONTEXTO RELEVANTE OBTENIDO MEDIANTE BÚSQUEDA SEMÁNTICA:\n${uniqueContext.substring(0, 4000)}\n\n`;
      }
    } catch (error) {
      console.warn('Error obteniendo contexto RAG, usando contenido directo:', error);
    }

    return `Analiza los siguientes documentos para el proyecto "${project.name}" (tipo ${project.type}).

Descripción del Proyecto: ${project.description || 'No se proporcionó contexto adicional.'}

${ragContext}

Documentos a analizar:
${documents.map((doc, idx) => `
Documento ${idx + 1} (ID: ${doc.id}):
- Nombre del archivo: ${doc.filename}
- Tipo: ${doc.type}
- Descripción: ${doc.description || 'Ninguna'}
- Vista previa del contenido:
${doc.content.substring(0, 2000)}
`).join('\n')}

Genera un informe completo de análisis ${project.type} basándote en TODO el contenido disponible. Enfócate en:
1. Insights y patrones clave en todos los documentos
2. Hallazgos críticos que requieren atención
3. Riesgos y oportunidades
4. Recomendaciones accionables con pasos específicos
5. Conclusiones basadas en evidencia

IMPORTANTE: 
- Responde TODO en ESPAÑOL
- Usa el contexto semántico obtenido para generar insights más profundos
- Asegúrate de que todos los hallazgos referencien IDs de documentos específicos para trazabilidad
- El análisis debe ser exhaustivo y basado en el contenido real de los documentos`;
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

  private static async generateBasicReport(options: AIPromptOptions): Promise<any> {
    const completedDocs = options.documents.filter(d => d.processing_status === 'completed');
    const allDocs = options.documents.length > 0 ? options.documents : [];
    const docsToUse = completedDocs.length > 0 ? completedDocs : allDocs;
    
    const reportTypeMap: Record<string, string> = {
      'executive': 'ejecutivo',
      'technical': 'técnico',
      'compliance': 'de cumplimiento',
      'financial': 'financiero',
    };

    // Si no hay documentos, generar informe inicial del proyecto
    if (docsToUse.length === 0) {
      return {
        executiveSummary: `Este informe ${reportTypeMap[options.reportType] || 'ejecutivo'} proporciona un análisis inicial del proyecto ${options.project.name}.\n\n${options.project.description || 'El proyecto se encuentra en fase inicial de recopilación de documentación. Se recomienda subir documentos relevantes para realizar un análisis más completo.'}`,
        documentAnalysis: [],
        keyFindings: [
          {
            id: 'finding-1',
            title: 'Estado Inicial del Proyecto',
            description: `El proyecto ${options.project.name} se encuentra en fase inicial. Se recomienda subir documentos para realizar un análisis más completo.`,
            severity: 'low' as const,
            document_references: [],
          },
        ],
        conclusions: `El proyecto ${options.project.name} está en desarrollo. Para un análisis más completo, se recomienda subir documentos relevantes al proyecto.`,
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
    const extractContent = (doc: any) => {
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
    const documentContents = docsToUse
      .map(doc => ({
        doc,
        content: extractContent(doc)
      }))
      .filter(item => item.content !== null);

    const allContent = documentContents
      .map(item => item.content!.content)
      .join('\n\n');

    const hasRealContent = documentContents.some(item => item.content!.hasRealContent);

    // Generar resumen ejecutivo usando RAG si está disponible
    const generateExecutiveSummary = async () => {
      if (!hasRealContent || allContent.length < 50) {
        return `Este informe ${reportTypeMap[options.reportType] || 'ejecutivo'} analiza ${docsToUse.length} documento${docsToUse.length > 1 ? 's' : ''} del proyecto "${options.project.name}".\n\n${options.project.description ? `Contexto del proyecto: ${options.project.description}\n\n` : ''}Los documentos proporcionados no contienen suficiente contenido textual extraído para realizar un análisis profundo. Se recomienda procesar los documentos para extraer su contenido completo o añadir descripciones detalladas.`;
      }

      try {
        // Intentar usar RAG para obtener contexto más relevante
        const documentIds = docsToUse.map(d => d.id);
        const ragContext = await RAGService.getRelevantContext(
          `resumen ejecutivo y puntos clave de ${options.project.name}`,
          documentIds,
          5
        );

        if (ragContext && ragContext.length > 100) {
          // Construir resumen ejecutivo basado en RAG
          let summary = `Este informe ${reportTypeMap[options.reportType] || 'ejecutivo'} presenta un análisis exhaustivo de ${docsToUse.length} documento${docsToUse.length > 1 ? 's' : ''} del proyecto "${options.project.name}".\n\n`;
          
          if (options.project.description) {
            summary += `Contexto del Proyecto:\n${options.project.description}\n\n`;
          }

          summary += `Resumen Ejecutivo basado en análisis semántico:\n\n${ragContext.substring(0, 1000)}${ragContext.length > 1000 ? '...' : ''}`;
          
          return summary.trim();
        }
      } catch (error) {
        console.warn('Error usando RAG, usando método básico:', error);
      }

      // Fallback a método básico
      const contentText = allContent;
      const paragraphs = contentText.split(/\n\s*\n|\.\s+(?=[A-Z])/).filter(p => p.trim().length > 50);
      const sentences = contentText.split(/[.!?]+/).filter(s => s.trim().length > 30);
      const relevantParagraphs = paragraphs
        .sort((a, b) => b.length - a.length)
        .slice(0, 3)
        .map(p => p.trim().substring(0, 200));

      let summary = `Este informe ${reportTypeMap[options.reportType] || 'ejecutivo'} presenta un análisis exhaustivo de ${docsToUse.length} documento${docsToUse.length > 1 ? 's' : ''} del proyecto "${options.project.name}".\n\n`;
      
      if (options.project.description) {
        summary += `Contexto del Proyecto:\n${options.project.description}\n\n`;
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
      return docsToUse.map((doc, idx) => {
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
        const stopWords = new Set(['este', 'esta', 'estos', 'estas', 'para', 'porque', 'cuando', 'donde', 'como', 'sobre', 'desde', 'hasta', 'entre', 'durante', 'mediante', 'según', 'contra', 'hacia', 'hasta', 'ante', 'bajo', 'cabe', 'con', 'de', 'desde', 'durante', 'en', 'entre', 'hacia', 'hasta', 'mediante', 'para', 'por', 'según', 'sin', 'sobre', 'tras', 'versus', 'vía', 'que', 'quien', 'cual', 'cuales', 'cuando', 'cuanto', 'donde', 'como', 'porque', 'aunque', 'mientras', 'si', 'sino', 'pero', 'mas', 'y', 'o', 'u', 'ni', 'no', 'también', 'tampoco', 'solo', 'solamente', 'aún', 'todavía', 'ya', 'ahora', 'entonces', 'luego', 'después', 'antes', 'hoy', 'ayer', 'mañana', 'siempre', 'nunca', 'a veces', 'mucho', 'poco', 'más', 'menos', 'muy', 'bastante', 'demasiado', 'todo', 'todos', 'toda', 'todas', 'alguno', 'algunos', 'alguna', 'algunas', 'ninguno', 'ningunos', 'ninguna', 'ningunas', 'otro', 'otros', 'otra', 'otras', 'mismo', 'mismos', 'misma', 'mismas', 'cada', 'cualquier', 'cualesquiera', 'tan', 'tanto', 'tanta', 'tantos', 'tantas', 'tanto', 'tanta', 'tantos', 'tantas']);
        
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
            document_references: docsToUse.map(d => d.id),
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
            document_references: docsToUse.filter(d => extractContent(d)?.hasRealContent).map(d => d.id),
          });
        }
      } else {
        findings.push({
          id: 'finding-1',
          title: 'Contenido Limitado Disponible',
          description: `Los documentos proporcionados contienen información limitada o no se ha podido extraer su contenido completo. Para un análisis más profundo, se recomienda procesar los documentos para extraer su contenido textual o añadir descripciones detalladas.`,
          severity: 'medium' as const,
          document_references: docsToUse.map(d => d.id),
        });
      }

      return findings.length > 0 ? findings : [
        {
          id: 'finding-1',
          title: 'Revisión de Documentación',
          description: `Se han revisado ${docsToUse.length} documento${docsToUse.length > 1 ? 's' : ''} del proyecto. ${hasRealContent ? 'Los documentos contienen información disponible para análisis.' : 'Se requiere procesamiento adicional de los documentos.'}`,
          severity: 'medium' as const,
          document_references: docsToUse.map(d => d.id),
        }
      ];
    };

    // Generar conclusiones basadas en el contenido
    const generateConclusions = () => {
      if (!hasRealContent || allContent.length < 100) {
        return `El análisis de ${docsToUse.length} documento${docsToUse.length > 1 ? 's' : ''} del proyecto "${options.project.name}" muestra que ${options.project.description || 'los documentos no contienen suficiente contenido textual extraído para realizar un análisis completo'}. Para obtener insights más profundos, se recomienda procesar los documentos para extraer su contenido completo o utilizar herramientas de análisis con IA.`;
      }

      // Extraer conclusiones más específicas del contenido
      const paragraphs = allContent.split(/\n\s*\n/).filter(p => p.trim().length > 50);
      const summaryParagraph = paragraphs.length > 0 
        ? paragraphs[0].substring(0, 200) 
        : allContent.substring(0, 200);

      return `Basado en el análisis exhaustivo de ${docsToUse.length} documento${docsToUse.length > 1 ? 's' : ''} del proyecto "${options.project.name}", ${options.project.description ? `en el contexto de ${options.project.description}, ` : ''}se han identificado elementos y patrones relevantes en la documentación. ${summaryParagraph}${allContent.length > 200 ? '...' : ''}\n\nSe recomienda realizar un análisis más profundo utilizando herramientas de IA para obtener insights específicos y detallados sobre el contenido de los documentos.`;
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
      executiveSummary: await generateExecutiveSummary(),
      documentAnalysis: generateDocumentAnalysis(),
      keyFindings: generateKeyFindings(),
      conclusions: generateConclusions(),
      recommendations: generateRecommendations(),
    };
  }
}
