'use client';

import { useState, useEffect } from 'react';
import { X, Edit, Eye, Save, Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react';

interface Finding {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  document_references: string[];
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  actionable_steps: string[];
}

interface DocumentAnalysis {
  id: string;
  title: string;
  content: string;
  document_references: string[];
}

interface ReportData {
  executive_summary: string;
  document_analysis: DocumentAnalysis[];
  key_findings: Finding[];
  conclusions: string;
  recommendations: Recommendation[];
}

interface ReportPreviewEditorProps {
  reportData: ReportData;
  reportTitle: string;
  reportType: string;
  onClose: () => void;
  onSave: (editedData: ReportData) => void;
}

export function ReportPreviewEditor({ 
  reportData, 
  reportTitle, 
  reportType,
  onClose, 
  onSave 
}: ReportPreviewEditorProps) {
  const [editedData, setEditedData] = useState<ReportData>(reportData);
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Detectar cambios
    const dataChanged = JSON.stringify(editedData) !== JSON.stringify(reportData);
    setHasChanges(dataChanged);
  }, [editedData, reportData]);

  const severityColors = {
    critical: 'bg-red-500/20 border-red-500 text-red-400',
    high: 'bg-orange-500/20 border-orange-500 text-orange-400',
    medium: 'bg-yellow-500/20 border-yellow-500 text-yellow-400',
    low: 'bg-blue-500/20 border-blue-500 text-blue-400',
  };

  const priorityColors = {
    high: 'bg-red-500/20 border-red-500 text-red-400',
    medium: 'bg-yellow-500/20 border-yellow-500 text-yellow-400',
    low: 'bg-green-500/20 border-green-500 text-green-400',
  };

  const handleSave = () => {
    onSave(editedData);
  };

  const updateExecutiveSummary = (value: string) => {
    setEditedData({ ...editedData, executive_summary: value });
  };

  const updateConclusions = (value: string) => {
    setEditedData({ ...editedData, conclusions: value });
  };

  const addFinding = () => {
    const newFinding: Finding = {
      id: `finding-${Date.now()}`,
      title: 'Nuevo Hallazgo',
      description: 'Descripción del hallazgo...',
      severity: 'medium',
      document_references: [],
    };
    setEditedData({
      ...editedData,
      key_findings: [...editedData.key_findings, newFinding],
    });
  };

  const updateFinding = (id: string, field: keyof Finding, value: any) => {
    setEditedData({
      ...editedData,
      key_findings: editedData.key_findings.map(f =>
        f.id === id ? { ...f, [field]: value } : f
      ),
    });
  };

  const deleteFinding = (id: string) => {
    setEditedData({
      ...editedData,
      key_findings: editedData.key_findings.filter(f => f.id !== id),
    });
  };

  const addRecommendation = () => {
    const newRec: Recommendation = {
      id: `rec-${Date.now()}`,
      title: 'Nueva Recomendación',
      description: 'Descripción de la recomendación...',
      priority: 'medium',
      actionable_steps: ['Paso 1', 'Paso 2'],
    };
    setEditedData({
      ...editedData,
      recommendations: [...editedData.recommendations, newRec],
    });
  };

  const updateRecommendation = (id: string, field: keyof Recommendation, value: any) => {
    setEditedData({
      ...editedData,
      recommendations: editedData.recommendations.map(r =>
        r.id === id ? { ...r, [field]: value } : r
      ),
    });
  };

  const deleteRecommendation = (id: string) => {
    setEditedData({
      ...editedData,
      recommendations: editedData.recommendations.filter(r => r.id !== id),
    });
  };

  const addActionStep = (recId: string) => {
    setEditedData({
      ...editedData,
      recommendations: editedData.recommendations.map(r =>
        r.id === recId
          ? { ...r, actionable_steps: [...r.actionable_steps, 'Nuevo paso'] }
          : r
      ),
    });
  };

  const updateActionStep = (recId: string, stepIndex: number, value: string) => {
    setEditedData({
      ...editedData,
      recommendations: editedData.recommendations.map(r =>
        r.id === recId
          ? {
              ...r,
              actionable_steps: r.actionable_steps.map((step, idx) =>
                idx === stepIndex ? value : step
              ),
            }
          : r
      ),
    });
  };

  const deleteActionStep = (recId: string, stepIndex: number) => {
    setEditedData({
      ...editedData,
      recommendations: editedData.recommendations.map(r =>
        r.id === recId
          ? {
              ...r,
              actionable_steps: r.actionable_steps.filter((_, idx) => idx !== stepIndex),
            }
          : r
      ),
    });
  };

  const addDocumentAnalysis = () => {
    const newAnalysis: DocumentAnalysis = {
      id: `analysis-${Date.now()}`,
      title: 'Nuevo Análisis',
      content: 'Contenido del análisis...',
      document_references: [],
    };
    setEditedData({
      ...editedData,
      document_analysis: [...editedData.document_analysis, newAnalysis],
    });
  };

  const updateDocumentAnalysis = (id: string, field: keyof DocumentAnalysis, value: any) => {
    setEditedData({
      ...editedData,
      document_analysis: editedData.document_analysis.map(a =>
        a.id === id ? { ...a, [field]: value } : a
      ),
    });
  };

  const deleteDocumentAnalysis = (id: string) => {
    setEditedData({
      ...editedData,
      document_analysis: editedData.document_analysis.filter(a => a.id !== id),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-slate-700 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white">{reportTitle}</h2>
            <p className="text-sm text-slate-400">Vista Previa y Edición del Informe</p>
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/50 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-amber-400">Cambios sin guardar</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex-1 px-6 py-3 font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'preview'
                ? 'bg-blue-600/20 text-blue-400 border-b-2 border-blue-500'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <Eye className="w-4 h-4" />
            Vista Previa
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex-1 px-6 py-3 font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'edit'
                ? 'bg-blue-600/20 text-blue-400 border-b-2 border-blue-500'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <Edit className="w-4 h-4" />
            Editar
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'preview' ? (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Executive Summary */}
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">Resumen Ejecutivo</h3>
                <p className="text-slate-300 whitespace-pre-wrap">{editedData.executive_summary}</p>
              </div>

              {/* Document Analysis */}
              {editedData.document_analysis.length > 0 && (
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Análisis de Documentos</h3>
                  <div className="space-y-4">
                    {editedData.document_analysis.map((analysis) => (
                      <div key={analysis.id} className="bg-slate-800 border border-slate-600 rounded-lg p-4">
                        <h4 className="font-semibold text-white mb-2">{analysis.title}</h4>
                        <p className="text-slate-300 text-sm whitespace-pre-wrap">{analysis.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Findings */}
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">Hallazgos Principales</h3>
                <div className="space-y-4">
                  {editedData.key_findings.map((finding) => (
                    <div key={finding.id} className="bg-slate-800 border border-slate-600 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-white">{finding.title}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${severityColors[finding.severity]}`}>
                          {finding.severity === 'critical' ? 'Crítica' : finding.severity === 'high' ? 'Alta' : finding.severity === 'medium' ? 'Media' : 'Baja'}
                        </span>
                      </div>
                      <p className="text-slate-300 text-sm whitespace-pre-wrap">{finding.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Conclusions */}
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">Conclusiones</h3>
                <p className="text-slate-300 whitespace-pre-wrap">{editedData.conclusions}</p>
              </div>

              {/* Recommendations */}
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">Recomendaciones</h3>
                <div className="space-y-4">
                  {editedData.recommendations.map((rec) => (
                    <div key={rec.id} className="bg-slate-800 border border-slate-600 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-white">{rec.title}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${priorityColors[rec.priority]}`}>
                          Prioridad {rec.priority === 'high' ? 'Alta' : rec.priority === 'medium' ? 'Media' : 'Baja'}
                        </span>
                      </div>
                      <p className="text-slate-300 text-sm mb-3 whitespace-pre-wrap">{rec.description}</p>
                      <div className="space-y-2">
                        <p className="text-slate-400 text-xs font-medium">Pasos Accionables:</p>
                        <ul className="space-y-1">
                          {rec.actionable_steps.map((step, idx) => (
                            <li key={idx} className="text-slate-300 text-sm flex items-start gap-2">
                              <span className="text-blue-400 mt-1">•</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Edit Executive Summary */}
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">Editar Resumen Ejecutivo</h3>
                <textarea
                  value={editedData.executive_summary}
                  onChange={(e) => updateExecutiveSummary(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Edit Document Analysis */}
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Editar Análisis de Documentos</h3>
                  <button
                    onClick={addDocumentAnalysis}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar
                  </button>
                </div>
                <div className="space-y-4">
                  {editedData.document_analysis.map((analysis) => (
                    <div key={analysis.id} className="bg-slate-800 border border-slate-600 rounded-lg p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <input
                          type="text"
                          value={analysis.title}
                          onChange={(e) => updateDocumentAnalysis(analysis.id, 'title', e.target.value)}
                          className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Título del análisis"
                        />
                        <button
                          onClick={() => deleteDocumentAnalysis(analysis.id)}
                          className="p-2 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <textarea
                        value={analysis.content}
                        onChange={(e) => updateDocumentAnalysis(analysis.id, 'content', e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="Contenido del análisis"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Edit Findings */}
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Editar Hallazgos</h3>
                  <button
                    onClick={addFinding}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar Hallazgo
                  </button>
                </div>
                <div className="space-y-4">
                  {editedData.key_findings.map((finding) => (
                    <div key={finding.id} className="bg-slate-800 border border-slate-600 rounded-lg p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <input
                          type="text"
                          value={finding.title}
                          onChange={(e) => updateFinding(finding.id, 'title', e.target.value)}
                          className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Título del hallazgo"
                        />
                        <select
                          value={finding.severity}
                          onChange={(e) => updateFinding(finding.id, 'severity', e.target.value as any)}
                          className="px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="low">Baja</option>
                          <option value="medium">Media</option>
                          <option value="high">Alta</option>
                          <option value="critical">Crítica</option>
                        </select>
                        <button
                          onClick={() => deleteFinding(finding.id)}
                          className="p-2 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <textarea
                        value={finding.description}
                        onChange={(e) => updateFinding(finding.id, 'description', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="Descripción del hallazgo"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Edit Conclusions */}
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">Editar Conclusiones</h3>
                <textarea
                  value={editedData.conclusions}
                  onChange={(e) => updateConclusions(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Edit Recommendations */}
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Editar Recomendaciones</h3>
                  <button
                    onClick={addRecommendation}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar Recomendación
                  </button>
                </div>
                <div className="space-y-4">
                  {editedData.recommendations.map((rec) => (
                    <div key={rec.id} className="bg-slate-800 border border-slate-600 rounded-lg p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <input
                          type="text"
                          value={rec.title}
                          onChange={(e) => updateRecommendation(rec.id, 'title', e.target.value)}
                          className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Título de la recomendación"
                        />
                        <select
                          value={rec.priority}
                          onChange={(e) => updateRecommendation(rec.id, 'priority', e.target.value as any)}
                          className="px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="low">Baja</option>
                          <option value="medium">Media</option>
                          <option value="high">Alta</option>
                        </select>
                        <button
                          onClick={() => deleteRecommendation(rec.id)}
                          className="p-2 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <textarea
                        value={rec.description}
                        onChange={(e) => updateRecommendation(rec.id, 'description', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-3"
                        placeholder="Descripción de la recomendación"
                      />
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-slate-400 text-xs font-medium">Pasos Accionables:</p>
                          <button
                            onClick={() => addActionStep(rec.id)}
                            className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            Agregar Paso
                          </button>
                        </div>
                        {rec.actionable_steps.map((step, stepIdx) => (
                          <div key={stepIdx} className="flex items-center gap-2">
                            <span className="text-blue-400 text-sm">•</span>
                            <input
                              type="text"
                              value={step}
                              onChange={(e) => updateActionStep(rec.id, stepIdx, e.target.value)}
                              className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder={`Paso ${stepIdx + 1}`}
                            />
                            <button
                              onClick={() => deleteActionStep(rec.id, stepIdx)}
                              className="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {hasChanges && (
                <div className="flex items-center gap-2 text-amber-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>Tienes cambios sin guardar</span>
                </div>
              )}
              {!hasChanges && (
                <div className="flex items-center gap-2 text-blue-400 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>Vista previa lista para guardar</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {hasChanges ? 'Guardar Cambios y Generar Informe' : 'Guardar y Generar Informe'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
