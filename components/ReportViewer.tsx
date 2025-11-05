'use client';

import { useState, useEffect } from 'react';
import { X, Download, FileText, AlertTriangle, CheckCircle2, TrendingUp, FileDown, Edit2, Save, XCircle } from 'lucide-react';
import { Report } from '@/types';
import { PDFExportService } from '@/lib/pdf-export';
import { supabase } from '@/lib/supabase';

interface ReportViewerProps {
  report: Report;
  projectName?: string;
  onClose: () => void;
  onUpdate?: () => void;
}

export function ReportViewer({ report, projectName, onClose, onUpdate }: ReportViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editedReport, setEditedReport] = useState<Report>(report);
  const [showFiscaliaForm, setShowFiscaliaForm] = useState(false);
  const [fiscaliaInfo, setFiscaliaInfo] = useState({
    fiscal: '',
    caso: '',
    escritura: '001',
    sumilla: 'Formula Informe Escrito de Análisis de Documentos',
  });

  useEffect(() => {
    setEditedReport(report);
  }, [report]);
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

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('reports')
        .update({
          executive_summary: editedReport.executive_summary,
          document_analysis: editedReport.document_analysis,
          key_findings: editedReport.key_findings,
          conclusions: editedReport.conclusions,
          recommendations: editedReport.recommendations,
          updated_at: new Date().toISOString(),
        })
        .eq('id', report.id);

      if (updateError) throw updateError;

      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setError(err.message || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedReport(report);
    setIsEditing(false);
    setError('');
  };

  const updateExecutiveSummary = (value: string) => {
    setEditedReport({ ...editedReport, executive_summary: value });
  };

  const updateDocumentAnalysis = (index: number, field: 'title' | 'content', value: string) => {
    const updated = [...editedReport.document_analysis];
    updated[index] = { ...updated[index], [field]: value };
    setEditedReport({ ...editedReport, document_analysis: updated });
  };

  const updateFinding = (index: number, field: 'title' | 'description', value: string) => {
    const updated = [...editedReport.key_findings];
    updated[index] = { ...updated[index], [field]: value };
    setEditedReport({ ...editedReport, key_findings: updated });
  };

  const updateConclusion = (value: string) => {
    setEditedReport({ ...editedReport, conclusions: value });
  };

  const updateRecommendation = (index: number, field: 'title' | 'description', value: string) => {
    const updated = [...editedReport.recommendations];
    updated[index] = { ...updated[index], [field]: value };
    setEditedReport({ ...editedReport, recommendations: updated });
  };

  const updateActionableStep = (recIndex: number, stepIndex: number, value: string) => {
    const updated = [...editedReport.recommendations];
    updated[recIndex] = {
      ...updated[recIndex],
      actionable_steps: updated[recIndex].actionable_steps.map((step, idx) => 
        idx === stepIndex ? value : step
      ),
    };
    setEditedReport({ ...editedReport, recommendations: updated });
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
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </button>
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
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <section>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-blue-400" />
              <h3 className="text-xl font-bold text-white">Resumen Ejecutivo</h3>
            </div>
            <div className="bg-slate-900 rounded-lg p-6 border border-slate-700">
              {isEditing ? (
                <textarea
                  value={editedReport.executive_summary}
                  onChange={(e) => updateExecutiveSummary(e.target.value)}
                  className="w-full min-h-[200px] bg-slate-800 border border-slate-600 rounded-lg p-4 text-slate-300 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                />
              ) : (
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{editedReport.executive_summary}</p>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-blue-400" />
              <h3 className="text-xl font-bold text-white">Análisis de Documentos</h3>
            </div>
            <div className="space-y-4">
              {editedReport.document_analysis.map((section, idx) => (
                <div key={section.id} className="bg-slate-900 rounded-lg p-6 border border-slate-700">
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => updateDocumentAnalysis(idx, 'title', e.target.value)}
                        className="w-full mb-3 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-lg font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <textarea
                        value={section.content}
                        onChange={(e) => updateDocumentAnalysis(idx, 'content', e.target.value)}
                        className="w-full min-h-[150px] mb-4 bg-slate-800 border border-slate-600 rounded-lg p-4 text-slate-300 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                      />
                    </>
                  ) : (
                    <>
                      <h4 className="text-lg font-semibold text-white mb-3">
                        {idx + 1}. {section.title}
                      </h4>
                      <p className="text-slate-300 mb-4 leading-relaxed whitespace-pre-wrap">{section.content}</p>
                    </>
                  )}
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
              {editedReport.key_findings.map((finding, idx) => (
                <div key={finding.id} className="bg-slate-900 rounded-lg p-6 border border-slate-700">
                  <div className="flex items-start justify-between mb-3">
                    {isEditing ? (
                      <input
                        type="text"
                        value={finding.title}
                        onChange={(e) => updateFinding(idx, 'title', e.target.value)}
                        className="flex-1 mr-3 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-lg font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <h4 className="text-lg font-semibold text-white">
                        {idx + 1}. {finding.title}
                      </h4>
                    )}
                    <span className={`px-3 py-1 border rounded text-xs font-medium ${getSeverityColor(finding.severity)}`}>
                      {getSeverityLabel(finding.severity)}
                    </span>
                  </div>
                  {isEditing ? (
                    <textarea
                      value={finding.description}
                      onChange={(e) => updateFinding(idx, 'description', e.target.value)}
                      className="w-full min-h-[100px] mb-4 bg-slate-800 border border-slate-600 rounded-lg p-4 text-slate-300 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                    />
                  ) : (
                    <p className="text-slate-300 mb-4 leading-relaxed whitespace-pre-wrap">{finding.description}</p>
                  )}
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
              {isEditing ? (
                <textarea
                  value={editedReport.conclusions}
                  onChange={(e) => updateConclusion(e.target.value)}
                  className="w-full min-h-[150px] bg-slate-800 border border-slate-600 rounded-lg p-4 text-slate-300 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                />
              ) : (
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{editedReport.conclusions}</p>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6 text-blue-400" />
              <h3 className="text-xl font-bold text-white">Recomendaciones</h3>
            </div>
            <div className="space-y-4">
              {editedReport.recommendations.map((rec, idx) => (
                <div key={rec.id} className="bg-slate-900 rounded-lg p-6 border border-slate-700">
                  <div className="flex items-start justify-between mb-3">
                    {isEditing ? (
                      <input
                        type="text"
                        value={rec.title}
                        onChange={(e) => updateRecommendation(idx, 'title', e.target.value)}
                        className="flex-1 mr-3 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-lg font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <h4 className="text-lg font-semibold text-white">
                        {idx + 1}. {rec.title}
                      </h4>
                    )}
                    <span className={`px-3 py-1 border rounded text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                      Prioridad {getPriorityLabel(rec.priority)}
                    </span>
                  </div>
                  {isEditing ? (
                    <textarea
                      value={rec.description}
                      onChange={(e) => updateRecommendation(idx, 'description', e.target.value)}
                      className="w-full min-h-[100px] mb-4 bg-slate-800 border border-slate-600 rounded-lg p-4 text-slate-300 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                    />
                  ) : (
                    <p className="text-slate-300 mb-4 leading-relaxed whitespace-pre-wrap">{rec.description}</p>
                  )}
                  <div className="bg-slate-800 rounded p-4">
                    <p className="text-sm font-medium text-slate-300 mb-2">Pasos Accionables:</p>
                    {isEditing ? (
                      <div className="space-y-2">
                        {rec.actionable_steps.map((step, i) => (
                          <input
                            key={i}
                            type="text"
                            value={step}
                            onChange={(e) => updateActionableStep(idx, i, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={`Paso ${i + 1}`}
                          />
                        ))}
                      </div>
                    ) : (
                      <ol className="space-y-2">
                        {rec.actionable_steps.map((step, i) => (
                          <li key={i} className="text-sm text-slate-400 flex gap-2">
                            <span className="text-blue-400 font-medium">{i + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    )}
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

