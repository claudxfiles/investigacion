import { Report } from '@/types';

// Este servicio usa importación dinámica para compatibilidad con Next.js

interface PDFExportOptions {
  report: Report;
  projectName?: string;
  fiscaliaInfo?: {
    fiscal?: string;
    caso?: string;
    escritura?: string;
    sumilla?: string;
  };
}

export class PDFExportService {
  static async exportToPDF(options: PDFExportOptions): Promise<void> {
    if (typeof window === 'undefined') {
      console.error('PDF export solo está disponible en el navegador');
      return;
    }

    // Importación dinámica
    const jsPDFModule = await import('jspdf');
    const autoTableModule = await import('jspdf-autotable');
    const jsPDF = jsPDFModule.default;
    const autoTable = autoTableModule.default;

    const { report, projectName, fiscaliaInfo } = options;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // Configuración de fuentes y colores
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    // Encabezado - Casilla Electrónica y Metadatos (esquina superior derecha)
    if (fiscaliaInfo) {
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text('Casilla Electrónica Nº', pageWidth - margin - 40, yPosition);
      doc.text(`Especialista: ${fiscaliaInfo.fiscal || 'N/A'}`, pageWidth - margin - 40, yPosition + 5);
      doc.text(`Caso Nº ${fiscaliaInfo.caso || 'N/A'}`, pageWidth - margin - 40, yPosition + 10);
      doc.text(`Escrito Nº ${fiscaliaInfo.escritura || '001'}`, pageWidth - margin - 40, yPosition + 15);
      doc.text(`Sumilla: ${fiscaliaInfo.sumilla || 'Informe de Análisis de Documentos'}`, pageWidth - margin - 40, yPosition + 20);
      yPosition += 30;
    }

    // Título del Informe (centrado)
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(report.title, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Información del Proyecto
    if (projectName) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Proyecto: ${projectName}`, margin, yPosition);
      yPosition += 7;
    }

    // Información del Reporte
    doc.setFontSize(9);
    doc.text(`Tipo de Informe: ${this.getReportTypeLabel(report.report_type)}`, margin, yPosition);
    yPosition += 5;
    doc.text(`Fecha de Generación: ${new Date(report.generated_at).toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`, margin, yPosition);
    yPosition += 5;
    doc.text(`Estado: ${this.getStatusLabel(report.status)}`, margin, yPosition);
    yPosition += 10;

    // Línea divisoria
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    // RESUMEN EJECUTIVO
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN EJECUTIVO', margin, yPosition);
    yPosition += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const executiveSummaryLines = doc.splitTextToSize(report.executive_summary, pageWidth - 2 * margin);
    doc.text(executiveSummaryLines, margin, yPosition);
    yPosition += executiveSummaryLines.length * 5 + 8;

    // Verificar si necesitamos nueva página
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = margin;
    }

    // ANÁLISIS DE DOCUMENTOS
    if (report.document_analysis && report.document_analysis.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('ANÁLISIS DE DOCUMENTOS', margin, yPosition);
      yPosition += 7;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      report.document_analysis.forEach((section, idx) => {
        // Verificar si necesitamos nueva página
        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = margin;
        }

        doc.setFont('helvetica', 'bold');
        doc.text(`${idx + 1}. ${section.title}`, margin, yPosition);
        yPosition += 6;

        doc.setFont('helvetica', 'normal');
        const contentLines = doc.splitTextToSize(section.content, pageWidth - 2 * margin);
        doc.text(contentLines, margin + 5, yPosition);
        yPosition += contentLines.length * 5 + 3;

        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Referencias de Documentos: ${section.document_references.length} documento(s)`, margin + 5, yPosition);
        yPosition += 8;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
      });
    }

    // Verificar si necesitamos nueva página
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = margin;
    }

    // HALLAZGOS CLAVE
    if (report.key_findings && report.key_findings.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('HALLAZGOS CLAVE', margin, yPosition);
      yPosition += 7;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      // Tabla de Hallazgos
      const findingsData = report.key_findings.map((finding, idx) => [
        `${idx + 1}`,
        finding.title,
        this.getSeverityLabel(finding.severity),
        finding.description.substring(0, 100) + (finding.description.length > 100 ? '...' : ''),
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['#', 'Hallazgo', 'Severidad', 'Descripción']],
        body: findingsData,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: margin, right: margin },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;

      // Detalles completos de hallazgos
      report.key_findings.forEach((finding, idx) => {
        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = margin;
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${idx + 1}. ${finding.title}`, margin, yPosition);
        yPosition += 6;

        doc.setFont('helvetica', 'normal');
        doc.text(`Severidad: ${this.getSeverityLabel(finding.severity)}`, margin, yPosition);
        yPosition += 5;

        const descriptionLines = doc.splitTextToSize(finding.description, pageWidth - 2 * margin);
        doc.text(descriptionLines, margin + 5, yPosition);
        yPosition += descriptionLines.length * 5 + 3;

        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Referenciado en: ${finding.document_references.length} documento(s)`, margin + 5, yPosition);
        yPosition += 8;
        doc.setTextColor(0, 0, 0);
      });
    }

    // Verificar si necesitamos nueva página
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = margin;
    }

    // CONCLUSIONES
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CONCLUSIONES', margin, yPosition);
    yPosition += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const conclusionsLines = doc.splitTextToSize(report.conclusions, pageWidth - 2 * margin);
    doc.text(conclusionsLines, margin, yPosition);
    yPosition += conclusionsLines.length * 5 + 10;

    // Verificar si necesitamos nueva página
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = margin;
    }

    // RECOMENDACIONES
    if (report.recommendations && report.recommendations.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('RECOMENDACIONES', margin, yPosition);
      yPosition += 7;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      report.recommendations.forEach((rec, idx) => {
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          yPosition = margin;
        }

        doc.setFont('helvetica', 'bold');
        doc.text(`${idx + 1}. ${rec.title}`, margin, yPosition);
        yPosition += 6;

        doc.setFont('helvetica', 'normal');
        doc.text(`Prioridad: ${this.getPriorityLabel(rec.priority)}`, margin, yPosition);
        yPosition += 5;

        const descriptionLines = doc.splitTextToSize(rec.description, pageWidth - 2 * margin);
        doc.text(descriptionLines, margin + 5, yPosition);
        yPosition += descriptionLines.length * 5 + 3;

        if (rec.actionable_steps && rec.actionable_steps.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.text('Pasos Accionables:', margin + 5, yPosition);
          yPosition += 5;

          doc.setFont('helvetica', 'normal');
          rec.actionable_steps.forEach((step, stepIdx) => {
            doc.text(`${stepIdx + 1}. ${step}`, margin + 10, yPosition);
            yPosition += 5;
          });
        }

        yPosition += 5;
      });
    }

    // Pie de página en cada página
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Página ${i} de ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      doc.text(
        `Generado el ${new Date().toLocaleDateString('es-ES')}`,
        pageWidth - margin,
        pageHeight - 10,
        { align: 'right' }
      );
    }

    // Guardar el PDF
    const fileName = `${report.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
    doc.save(fileName);
  }

  private static getReportTypeLabel(type: string): string {
    switch (type) {
      case 'executive': return 'Ejecutivo';
      case 'technical': return 'Técnico';
      case 'compliance': return 'Cumplimiento';
      case 'financial': return 'Financiero';
      default: return type;
    }
  }

  private static getStatusLabel(status: string): string {
    switch (status) {
      case 'draft': return 'Borrador';
      case 'final': return 'Final';
      case 'exported': return 'Exportado';
      default: return status;
    }
  }

  private static getSeverityLabel(severity: string): string {
    switch (severity) {
      case 'critical': return 'Crítica';
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return severity;
    }
  }

  private static getPriorityLabel(priority: string): string {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return priority;
    }
  }
}

