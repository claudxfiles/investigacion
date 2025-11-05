'use client';

import { useState } from 'react';
import { X, Download, FileText, AlertTriangle, CheckCircle2, TrendingUp, FileDown } from 'lucide-react';
import { Report } from '@/types';
import { PDFExportService } from '@/lib/pdf-export';

interface ReportViewerProps {
  report: Report;
  projectName?: string;
  onClose: () => void;
}

export function ReportViewer({ report, projectName, onClose }: ReportViewerProps) {
  const [showFiscaliaForm, setShowFiscaliaForm] = useState(false);
  const [fiscaliaInfo, setFiscaliaInfo] = useState({
    fiscal: '',
    caso: '',
    escritura: '001',
    sumilla: 'Formula Informe Escrito de Análisis de Documentos',
  });
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 text-red-400 border-red-500/50';
      case 'high':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/50';
      case 'medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/50';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/50';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'critical': return 'Crítica';
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      default: return 'Baja';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/10 text-red-400 border-red-500/50';
      case 'medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/50';
      default:
        return 'bg-green-500/10 text-green-400 border-green-500/50';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      default: return 'Baja';
    }
  };

  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case 'executive': return 'Ejecutivo';
      case 'technical': return 'Técnico';
      case 'compliance': return 'Cumplimiento';
      case 'financial': return 'Financiero';
      default: return type;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Borrador';
      case 'final': return 'Final';
      case 'exported': return 'Exportado';
      default: return status;
    }
  };

  const handleExportPDF = async () => {
    await PDFExportService.exportToPDF({
      report,
      projectName,
      fiscaliaInfo: showFiscaliaForm && (fiscaliaInfo.fiscal || fiscaliaInfo.caso) ? fiscaliaInfo : undefined,
    });
  };

  const handleExportPDFWithFiscalia = () => {
    setShowFiscaliaForm(true);
  };

  const handleSubmitFiscaliaForm = () => {
    handleExportPDF();
    setShowFiscaliaForm(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden border border-slate-700 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-slate-900">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">{report.title}</h2>
            <div className="flex items-center gap-3 text-sm">
              <span className="px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/50 rounded">
                {getReportTypeLabel(report.report_type)}
              </span>
              <span className="px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/50 rounded">
                {getStatusLabel(report.status)}
              </span>
              <span className="text-slate-400">
                Generado: {new Date(report.generated_at).toLocaleDateString('es-ES')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <FileDown className="w-4 h-4" />
              Exportar PDF
            </button>
            <button
              onClick={handleExportPDFWithFiscalia}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4" />
              PDF Fiscalía
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <section>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-blue-400" />
              <h3 className="text-xl font-bold text-white">Resumen Ejecutivo</h3>
            </div>
            <div className="bg-slate-900 rounded-lg p-6 border border-slate-700">
              <p className="text-slate-300 leading-relaxed">{report.executive_summary}</p>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-blue-400" />
              <h3 className="text-xl font-bold text-white">Análisis de Documentos</h3>
            </div>
            <div className="space-y-4">
              {report.document_analysis.map((section, idx) => (
                <div key={section.id} className="bg-slate-900 rounded-lg p-6 border border-slate-700">
                  <h4 className="text-lg font-semibold text-white mb-3">
                    {idx + 1}. {section.title}
                  </h4>
                  <p className="text-slate-300 mb-4 leading-relaxed">{section.content}</p>
                  <div className="text-sm text-slate-400 bg-slate-800 rounded px-3 py-2">
                    <span className="font-medium">Referencias de Fuente:</span> {section.document_references.length} documento(s)
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
              <h3 className="text-xl font-bold text-white">Hallazgos Clave</h3>
            </div>
            <div className="space-y-4">
              {report.key_findings.map((finding, idx) => (
                <div key={finding.id} className="bg-slate-900 rounded-lg p-6 border border-slate-700">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-lg font-semibold text-white">
                      {idx + 1}. {finding.title}
                    </h4>
                    <span className={`px-3 py-1 border rounded text-xs font-medium ${getSeverityColor(finding.severity)}`}>
                      {getSeverityLabel(finding.severity)}
                    </span>
                  </div>
                  <p className="text-slate-300 mb-4 leading-relaxed">{finding.description}</p>
                  <div className="text-sm text-slate-400 bg-slate-800 rounded px-3 py-2">
                    <span className="font-medium">Referenciado en:</span> {finding.document_references.length} documento(s)
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
              <h3 className="text-xl font-bold text-white">Conclusiones</h3>
            </div>
            <div className="bg-slate-900 rounded-lg p-6 border border-slate-700">
              <p className="text-slate-300 leading-relaxed">{report.conclusions}</p>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6 text-blue-400" />
              <h3 className="text-xl font-bold text-white">Recomendaciones</h3>
            </div>
            <div className="space-y-4">
              {report.recommendations.map((rec, idx) => (
                <div key={rec.id} className="bg-slate-900 rounded-lg p-6 border border-slate-700">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-lg font-semibold text-white">
                      {idx + 1}. {rec.title}
                    </h4>
                    <span className={`px-3 py-1 border rounded text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                      Prioridad {getPriorityLabel(rec.priority)}
                    </span>
                  </div>
                  <p className="text-slate-300 mb-4 leading-relaxed">{rec.description}</p>
                  <div className="bg-slate-800 rounded p-4">
                    <p className="text-sm font-medium text-slate-300 mb-2">Pasos Accionables:</p>
                    <ol className="space-y-2">
                      {rec.actionable_steps.map((step, i) => (
                        <li key={i} className="text-sm text-slate-400 flex gap-2">
                          <span className="text-blue-400 font-medium">{i + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Modal para información de Fiscalía */}
      {showFiscaliaForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[60]">
          <div className="bg-slate-800 rounded-xl max-w-md w-full border border-slate-700">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h3 className="text-xl font-bold text-white">Información de Fiscalía</h3>
              <button
                onClick={() => setShowFiscaliaForm(false)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Fiscal Especialista
                </label>
                <input
                  type="text"
                  value={fiscaliaInfo.fiscal}
                  onChange={(e) => setFiscaliaInfo({ ...fiscaliaInfo, fiscal: e.target.value })}
                  placeholder="Ej: Dr. Julio Orellana Huamannahui"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Número de Caso
                </label>
                <input
                  type="text"
                  value={fiscaliaInfo.caso}
                  onChange={(e) => setFiscaliaInfo({ ...fiscaliaInfo, caso: e.target.value })}
                  placeholder="Ej: 1486015508-2018-125-8"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Número de Escritura
                </label>
                <input
                  type="text"
                  value={fiscaliaInfo.escritura}
                  onChange={(e) => setFiscaliaInfo({ ...fiscaliaInfo, escritura: e.target.value })}
                  placeholder="Ej: 001"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Sumilla
                </label>
                <input
                  type="text"
                  value={fiscaliaInfo.sumilla}
                  onChange={(e) => setFiscaliaInfo({ ...fiscaliaInfo, sumilla: e.target.value })}
                  placeholder="Ej: Formula Informe Escrito de Análisis"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="bg-amber-500/10 border border-amber-500/50 rounded-lg p-3">
                <p className="text-amber-400 text-sm">
                  <strong>Nota:</strong> Los campos son opcionales. Si no los completas, el PDF se generará sin información de fiscalía en el encabezado.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowFiscaliaForm(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmitFiscaliaForm}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  Generar PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

