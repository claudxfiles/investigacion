// Plantillas de Informes basadas en COSTA (Contexto, Objetivo, Estilo, Tono, Audiencia, Respuesta)

export interface ReportTemplate {
  context: string;
  objective: string;
  style: string;
  tone: string;
  audience: string;
  structure: string[];
}

export const ReportTemplates: Record<'executive' | 'technical' | 'compliance' | 'financial', ReportTemplate> = {
  executive: {
    context: 'El informe recopila información de diversas fuentes y sintetiza los principales resultados, hallazgos y conclusiones de una investigación. Debe servir como resumen ejecutivo de alto nivel para tomadores de decisiones.',
    objective: 'Generar un informe ejecutivo de investigación con un resumen claro, hallazgos clave y conclusiones estratégicas, usando un lenguaje formal, directo y orientado a resultados.',
    style: 'Redacción profesional, tipo "resumen para alta dirección", con encabezados, viñetas y secciones bien definidas.',
    tone: 'Formal, analítico y objetivo. Evitar opiniones personales o lenguaje emocional.',
    audience: 'Directivos, gerentes o autoridades que necesitan una visión rápida y sintética de los resultados del análisis.',
    structure: [
      'Resumen Ejecutivo',
      'Metodología de Investigación',
      'Hallazgos Principales',
      'Conclusiones y Recomendaciones',
      'Anexo de Referencias',
    ],
  },
  technical: {
    context: 'El informe debe documentar un análisis técnico o científico basado en datos, experimentos, o revisión documental especializada.',
    objective: 'Generar un informe técnico de investigación, incluyendo detalles metodológicos, interpretación de resultados y recomendaciones técnicas.',
    style: 'Estilo técnico, estructurado y basado en evidencia. Debe incluir tablas, listas numeradas o figuras si es relevante.',
    tone: 'Preciso, técnico y académico.',
    audience: 'Profesionales o especialistas del área técnica o científica que requieren conocer los detalles del proceso y los resultados del análisis.',
    structure: [
      'Resumen Técnico',
      'Objetivos del Estudio',
      'Metodología Detallada',
      'Resultados y Análisis',
      'Conclusiones Técnicas',
      'Referencias Bibliográficas',
    ],
  },
  compliance: {
    context: 'Se requiere evaluar si un conjunto de documentos, procesos o actividades cumplen con normativas legales, reglamentarias o internas.',
    objective: 'Elaborar un informe de cumplimiento, identificando desviaciones, riesgos y recomendaciones correctivas.',
    style: 'Estilo formal y normativo. Usa un lenguaje propio de auditoría, con claridad y precisión en los hallazgos.',
    tone: 'Imparcial, objetivo y profesional.',
    audience: 'Auditores, equipos legales, directores de cumplimiento o autoridades regulatorias.',
    structure: [
      'Resumen de Cumplimiento',
      'Alcance y Criterios de Evaluación',
      'Hallazgos de Cumplimiento / No Cumplimiento',
      'Análisis de Riesgos',
      'Recomendaciones Correctivas',
      'Anexo de Evidencias',
    ],
  },
  financial: {
    context: 'El informe se centra en analizar información económica, presupuestaria o contable para determinar desempeño financiero, tendencias o riesgos.',
    objective: 'Generar un informe financiero de análisis, basado en datos económicos o financieros, con hallazgos cuantitativos y conclusiones estratégicas.',
    style: 'Estilo analítico y cuantitativo. Incluye cifras, indicadores clave, tablas o gráficos cuando corresponda.',
    tone: 'Profesional, objetivo y analítico.',
    audience: 'Analistas financieros, inversionistas, autoridades fiscales o gerentes de finanzas.',
    structure: [
      'Resumen Financiero',
      'Objetivos del Análisis',
      'Datos y Fuentes',
      'Análisis de Resultados',
      'Conclusiones y Recomendaciones Estratégicas',
      'Anexo de Tablas o Indicadores',
    ],
  },
};

export function getTemplateForReportType(reportType: 'executive' | 'technical' | 'compliance' | 'financial'): ReportTemplate {
  return ReportTemplates[reportType];
}

