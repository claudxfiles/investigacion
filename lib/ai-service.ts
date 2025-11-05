import { Document, Project } from '@/types';
import { ReportTemplates, getTemplateForReportType } from './templates';
import { RAGService } from './rag-service';
import { EmbeddingService } from './embedding-service';

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
    // Inicializar también el servicio de embeddings
    EmbeddingService.initialize(apiKey);
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

    // 🔥 NUEVO: Usar RAG para obtener contexto relevante
    let ragContext = '';
    let ragDocuments: Document[] = [];
    
    try {
      // Generar query basada en el tipo de reporte
      const reportTypeQueries = {
        'executive': `análisis ejecutivo general, resumen de hallazgos principales, conclusiones estratégicas, recomendaciones de alto nivel`,
        'technical': `análisis técnico detallado, especificaciones, implementación, arquitectura, metodología`,
        'compliance': `cumplimiento normativo, regulaciones, requisitos legales, auditoría, estándares`,
        'financial': `análisis financiero, estados financieros, métricas, indicadores económicos, presupuesto`,
      };
      
      const searchQuery = `${reportTypeQueries[options.reportType]} ${options.project.description || ''}`;
      
      console.log(`🔍 Buscando contexto relevante con RAG para reporte ${options.reportType}...`);
      
      const ragResults = await RAGService.searchSimilar(
        searchQuery,
        options.project.id,
        15, // Obtener top 15 chunks más relevantes
        0.75 // Threshold de similitud
      );
      
      if (ragResults.chunks.length > 0) {
        ragContext = ragResults.context;
        ragDocuments = ragResults.documents;
        console.log(`✅ RAG encontró ${ragResults.chunks.length} chunks relevantes de ${ragDocuments.length} documentos`);
      } else {
        console.log(`⚠️ RAG no encontró contexto relevante, usando método tradicional`);
      }
    } catch (ragError) {
      console.error('Error en búsqueda RAG, continuando con método tradicional:', ragError);
    }

    // Preparar documentos para análisis (método tradicional como fallback)
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
    const userPrompt = this.getUserPrompt(options.project, documentContexts, ragContext, ragDocuments);

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

Tu tarea es analizar CONTENIDO REAL de documentos y generar un informe BASADO EN EVIDENCIA.

═══════════════════════════════════════════════════════════════════════════════
⚠️ REGLAS CRÍTICAS - NO NEGOCIABLES
═══════════════════════════════════════════════════════════════════════════════

1. ❌ PROHIBIDO generar datos mock, ficticios, de ejemplo, o plantillas genéricas
2. ✅ OBLIGATORIO usar ÚNICAMENTE información que aparece en el contexto proporcionado
3. ✅ OBLIGATORIO citar fragmentos específicos del contenido en cada hallazgo
4. ✅ OBLIGATORIO incluir números, nombres, fechas exactos que aparecen en los documentos
5. ❌ PROHIBIDO usar frases vagas como "se observa que" sin evidencia concreta
6. ✅ OBLIGATORIO cada hallazgo debe ser verificable contra el contenido real
7. ✅ OBLIGATORIO si hay contexto RAG, ese es tu ÚNICA fuente de verdad

═══════════════════════════════════════════════════════════════════════════════

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

═══════════════════════════════════════════════════════════════════════════════
📋 FORMATO DE RESPUESTA JSON
═══════════════════════════════════════════════════════════════════════════════

Genera tu respuesta como un objeto JSON con la siguiente estructura:
{
  "executive_summary": "Un resumen completo BASADO EN EL CONTENIDO REAL proporcionado. Debe incluir: ${template.structure.join(', ')}. CITA datos específicos del contexto.",
  "document_analysis": [
    {
      "title": "Título específico del análisis basado en contenido real",
      "content": "Análisis detallado con CITAS TEXTUALES entre comillas del contenido real, números específicos, nombres exactos, fechas concretas...",
      "document_ids": ["doc-id-1", "doc-id-2"]
    }
  ],
  "key_findings": [
    {
      "title": "Título del hallazgo basado en evidencia concreta",
      "description": "Descripción con EVIDENCIA DIRECTA: citas entre comillas, números exactos, referencias específicas del contenido. Ejemplo: 'En el documento X se menciona: [cita textual]' o 'Los datos muestran un valor de $XXX en la columna Y'",
      "severity": "crítica|alta|media|baja",
      "document_ids": ["doc-id-1"]
    }
  ],
  "conclusions": "Conclusiones completas basadas ÚNICAMENTE en el análisis del contenido real proporcionado. Menciona hallazgos específicos encontrados en el contenido.",
  "recommendations": [
    {
      "title": "Título de la recomendación basada en hallazgos reales",
      "description": "Descripción que SE DERIVA DIRECTAMENTE de los hallazgos en el contenido real...",
      "priority": "alta|media|baja",
      "actionable_steps": ["Paso 1 específico basado en el contenido", "Paso 2 accionable basado en hallazgos reales", "Paso 3 con métricas del contenido"]
    }
  ]
}

═══════════════════════════════════════════════════════════════════════════════
✅ CHECKLIST ANTES DE RESPONDER
═══════════════════════════════════════════════════════════════════════════════

Antes de enviar tu respuesta, verifica:
☑ ¿Cada hallazgo cita contenido específico del contexto proporcionado?
☑ ¿Incluí números, nombres, fechas EXACTOS que aparecen en los documentos?
☑ ¿Usé comillas para citar texto directamente del contexto?
☑ ¿Evité frases genéricas o información que inventé?
☑ ¿Todos los IDs de documentos son reales y se mencionaron en el prompt?
☑ ¿Las recomendaciones se derivan de hallazgos reales en el contenido?
☑ ¿El resumen ejecutivo refleja CONTENIDO REAL, no ejemplos genéricos?

═══════════════════════════════════════════════════════════════════════════════

IMPORTANTE: 
- TODA la respuesta debe estar en ESPAÑOL
- SIGUE ESTRICTAMENTE la estructura de la plantilla: ${template.structure.join(' → ')}
- Usa el ${template.tone} en todo el contenido
- El estilo debe ser ${template.style}
- Dirígete a ${template.audience}
- Sé ULTRA-ESPECÍFICO y basado en EVIDENCIA REAL
- CITA contenido real de los documentos con comillas
- Usa niveles de severidad apropiados (crítica, alta, media, baja)
- Proporciona recomendaciones accionables BASADAS EN HALLAZGOS REALES
- Asegúrate de que todos los hallazgos sean rastreables y VERIFICABLES contra el contenido proporcionado`;
  }

  private static getUserPrompt(
    project: Project, 
    documents: Array<{ id: string; filename: string; description: string; type: string; content: string }>,
    ragContext: string = '',
    ragDocuments: Document[] = []
  ): string {
    // Detectar si hay archivos Excel en los documentos
    const excelDocs = documents.filter(doc => 
      doc.type === 'excel' || 
      doc.filename.toLowerCase().endsWith('.xlsx') || 
      doc.filename.toLowerCase().endsWith('.xls')
    );
    
    const hasExcelFiles = excelDocs.length > 0;
    const hasRagContext = ragContext && ragContext.length > 0;
    
    let excelInstructions = '';
    if (hasExcelFiles) {
      excelInstructions = `

📊 INSTRUCCIONES ESPECIALES PARA ANÁLISIS DE DATOS TABULARES (EXCEL):

Los siguientes documentos contienen datos estructurados en formato de hojas de cálculo:
${excelDocs.map(doc => `- ${doc.filename} (ID: ${doc.id})`).join('\n')}

Al analizar estos archivos Excel, presta especial atención a:
1. **Estructura de Datos**: Identifica columnas, tipos de datos (numéricos, texto, fechas)
2. **Patrones Numéricos**: Analiza tendencias, totales, promedios, máximos y mínimos
3. **Relaciones entre Columnas**: Encuentra correlaciones y dependencias entre datos
4. **Anomalías**: Detecta valores atípicos, inconsistencias o datos faltantes
5. **Análisis Temporal**: Si hay fechas, identifica tendencias a lo largo del tiempo
6. **Categorización**: Agrupa datos por categorías relevantes y extrae insights
7. **Comparaciones**: Compara valores entre diferentes filas, columnas u hojas
8. **Cálculos Derivados**: Sugiere métricas adicionales que podrían ser útiles

Para cada hoja de cálculo, proporciona:
- Resumen de la estructura de datos
- Hallazgos estadísticos clave
- Insights basados en los patrones encontrados
- Recomendaciones específicas basadas en los datos numéricos`;
    }

    // 🔥 NUEVO: Agregar contexto RAG si está disponible
    let ragSection = '';
    if (hasRagContext) {
      ragSection = `

═══════════════════════════════════════════════════════════════════════════════
🧠 CONTEXTO REAL DEL DOCUMENTO (Recuperado con RAG)
═══════════════════════════════════════════════════════════════════════════════

⚠️ INSTRUCCIÓN CRÍTICA: Este es el contenido REAL extraído de los documentos del proyecto.
DEBES analizar este contenido y NO generar información mock o de ejemplo.

Los siguientes fragmentos contienen el contenido más relevante de los documentos:

${ragContext}

📋 Documentos de origen del contexto RAG:
${ragDocuments.map(doc => `- ${doc.filename} (ID: ${doc.id}) - ${doc.file_type.toUpperCase()}`).join('\n')}

═══════════════════════════════════════════════════════════════════════════════
⚠️ IMPORTANTE - LEE ESTO CUIDADOSAMENTE:
═══════════════════════════════════════════════════════════════════════════════

1. El contexto anterior es CONTENIDO REAL de los documentos subidos por el usuario
2. DEBES basar tu análisis COMPLETAMENTE en este contenido real
3. NO inventes datos, estadísticas, nombres de empresas, o información genérica
4. CITA fragmentos específicos del contenido RAG en tus hallazgos
5. REFERENCIA números de página, secciones, o datos concretos que aparecen en el contexto
6. Si el contexto menciona nombres, fechas, números, cantidades, o hechos específicos: ÚSALOS
7. Cada hallazgo DEBE tener referencias directas al contenido mostrado arriba
8. NO uses frases genéricas como "se observa que", "se recomienda" sin citar evidencia específica

EJEMPLO DE ANÁLISIS CORRECTO:
❌ MAL: "Se detectaron inconsistencias financieras que requieren atención"
✅ BIEN: "En el fragmento del documento Balance_2023.xlsx se observa un valor de ingresos de $2,450,000 en Q1 pero solo $890,000 en Q2, representando una caída del 63.6% que requiere investigación inmediata"

❌ MAL: "El proyecto tiene riesgos de cumplimiento"
✅ BIEN: "El contrato menciona explícitamente en la cláusula 5.3: 'El proveedor debe entregar reportes mensuales antes del día 5', sin embargo, los emails adjuntos muestran entregas los días 12 y 18, incumpliendo el acuerdo"

═══════════════════════════════════════════════════════════════════════════════
`;
    }

    // Si NO hay contexto RAG pero hay documentos, mostrar advertencia
    let noRagWarning = '';
    if (!hasRagContext && documents.length > 0) {
      noRagWarning = `

⚠️ ADVERTENCIA: No se encontró contenido RAG relevante para este análisis.
Esto puede deberse a que:
1. Los documentos están siendo procesados aún
2. Los documentos no contienen texto extraíble (imágenes sin OCR, PDFs escaneados)
3. El texto es muy corto (<100 caracteres)

Por favor, genera un análisis básico basado en los metadatos disponibles de los documentos.
`;
    }

    return `Analiza los siguientes documentos para el proyecto "${project.name}" (tipo ${project.type}).

Descripción del Proyecto: ${project.description || 'No se proporcionó contexto adicional.'}${excelInstructions}${ragSection}${noRagWarning}

${!hasRagContext ? `
Documentos disponibles (información de metadata):
${documents.map((doc, idx) => {
  const isExcel = doc.type === 'excel' || doc.filename.toLowerCase().endsWith('.xlsx') || doc.filename.toLowerCase().endsWith('.xls');
  return `
Documento ${idx + 1} (ID: ${doc.id}):
- Nombre del archivo: ${doc.filename}
- Tipo: ${doc.type}${isExcel ? ' 📊 (EXCEL - Datos Tabulares)' : ''}
- Descripción: ${doc.description || 'Ninguna'}
- Vista previa del contenido:
${doc.content}
`;
}).join('\n')}` : ''}

═══════════════════════════════════════════════════════════════════════════════
📝 REQUISITOS DEL INFORME
═══════════════════════════════════════════════════════════════════════════════

Genera un informe completo de análisis ${project.type} que sea:

✅ BASADO EN EVIDENCIA REAL:
${hasRagContext ? 
  `- Usa EXCLUSIVAMENTE el contenido del contexto RAG mostrado arriba
- Cada hallazgo DEBE citar fragmentos específicos del contenido
- Incluye números, datos, nombres, fechas exactos que aparecen en los documentos
- NO generes ejemplos ficticios o información genérica` :
  `- Usa la metadata y descripciones disponibles de los documentos
- Menciona específicamente los nombres de archivo y tipos de documento
- Genera análisis basado en el tipo de documento y su descripción`}

✅ ESPECÍFICO Y DETALLADO:
1. Insights y patrones clave CONCRETOS${hasExcelFiles ? ' (con números exactos de los datos de Excel)' : ''}
2. Hallazgos críticos CON EVIDENCIA DIRECTA${hasExcelFiles ? ' (referencias a celdas/columnas específicas)' : ''}
3. Riesgos y oportunidades IDENTIFICABLES${hasRagContext ? ' (con citas textuales del contexto)' : ''}
4. Recomendaciones accionables BASADAS EN DATOS REALES${hasExcelFiles ? ' (con métricas cuantitativas)' : ''}
5. Conclusiones SUSTENTADAS EN EVIDENCIA${hasRagContext ? ' (con referencias a fragmentos específicos)' : ''}

✅ TRAZABLE Y VERIFICABLE:
- Cada hallazgo DEBE incluir: IDs de documentos + fragmentos específicos citados
${hasRagContext ? '- Usa comillas para citar texto exacto del contexto RAG' : ''}
- Menciona números de línea, secciones, o ubicaciones específicas cuando sea posible
${hasExcelFiles ? '- Para Excel: menciona nombres de columnas, rangos de celdas, valores específicos' : ''}

IMPORTANTE: 
- Responde TODO en ESPAÑOL
- NO uses información mock, plantillas genéricas, o ejemplos ficticios
- TODO el contenido DEBE ser rastreable a los documentos reales proporcionados
${hasRagContext ? '- PRIORIZA el análisis del contexto RAG - es el contenido REAL de los documentos' : ''}
${hasExcelFiles ? '- Para archivos Excel, incluye estadísticas concretas (números exactos, porcentajes calculados, rangos)\n- Menciona nombres específicos de columnas y valores que realmente existen en los datos' : ''}`;
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
