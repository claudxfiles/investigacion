'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Upload, FileText, TrendingUp, AlertCircle, Download, Trash2 } from 'lucide-react';
import { Project, Document, Report } from '@/types';
import { supabase } from '@/lib/supabase';
import { DocumentUpload } from './DocumentUpload';
import { DocumentList } from './DocumentList';
import { ReportGenerator } from './ReportGenerator';
import { ReportViewer } from './ReportViewer';


interface ProjectDashboardProps {
  project: Project;
  onBack: () => void;
}

export function ProjectDashboard({ project, onBack }: ProjectDashboardProps) {
  const [activeTab, setActiveTab] = useState<'documents' | 'reports'>('documents');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalDocuments: 0,
    processingDocuments: 0,
    totalReports: 0,
  });

  useEffect(() => {
    loadDocuments();
    loadReports();
  }, [project.id]);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', project.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);

      setStats(prev => ({
        ...prev,
        totalDocuments: data?.length || 0,
        processingDocuments: data?.filter(d => d.processing_status === 'processing').length || 0,
      }));
    } catch (error) {
      console.error('Error al cargar documentos:', error);
    }
  };

  const loadReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('project_id', project.id)
        .order('generated_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);

      setStats(prev => ({
        ...prev,
        totalReports: data?.length || 0,
      }));
    } catch (error) {
      console.error('Error al cargar informes:', error);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'financial': return 'Financiero';
      case 'legal': return 'Legal';
      default: return 'General';
    }
  };

  const handleDeleteReport = async (report: Report, e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que se abra el visor al hacer clic en eliminar
    
    if (!confirm(`¿Estás seguro de que deseas eliminar "${report.title}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    setDeletingReportId(report.id);
    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', report.id);

      if (error) throw error;

      loadReports();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar el informe');
    } finally {
      setDeletingReportId(null);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver a Proyectos
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{project.name}</h1>
            <p className="text-slate-400">{project.description}</p>
          </div>
          <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/50 rounded-lg text-sm">
            {getTypeLabel(project.type)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-8 h-8 text-blue-400" />
            <span className="text-3xl font-bold text-white">{stats.totalDocuments}</span>
          </div>
          <p className="text-slate-400 text-sm">Documentos Totales</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-green-400" />
            <span className="text-3xl font-bold text-white">{stats.totalReports}</span>
          </div>
          <p className="text-slate-400 text-sm">Informes Generados</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="w-8 h-8 text-amber-400" />
            <span className="text-3xl font-bold text-white">{stats.processingDocuments}</span>
          </div>
          <p className="text-slate-400 text-sm">Procesando</p>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="border-b border-slate-700">
          <div className="flex">
            <button
              onClick={() => setActiveTab('documents')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'documents'
                  ? 'text-blue-400 bg-slate-900 border-b-2 border-blue-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Documentos
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'reports'
                  ? 'text-blue-400 bg-slate-900 border-b-2 border-blue-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Informes
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'documents' ? (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">Biblioteca de Documentos</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowUpload(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Upload className="w-5 h-5" />
                    Subir Documentos
                  </button>
                </div>
              </div>
              <DocumentList documents={documents} onUpdate={loadDocuments} />
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">Informes de Análisis</h3>
                <button
                  onClick={() => setShowGenerator(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Generar Informe
                </button>
              </div>
              <div className="space-y-4">
                {reports.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">Aún no se han generado informes</p>
                    <p className="text-slate-500 text-sm mt-2">Sube documentos primero, luego genera un informe</p>
                  </div>
                ) : (
                  reports.map((report) => (
                    <div
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className="bg-slate-900 border border-slate-700 rounded-lg p-4 hover:border-blue-500 cursor-pointer transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-lg font-semibold text-white mb-1">{report.title}</h4>
                          <div className="flex items-center gap-3 text-sm text-slate-400">
                            <span className="capitalize">{report.report_type}</span>
                            <span>•</span>
                            <span className="capitalize">{report.status}</span>
                            <span>•</span>
                            <span>{new Date(report.generated_at).toLocaleDateString('es-ES')}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Download className="w-5 h-5 text-slate-400" />
                          <button
                            onClick={(e) => handleDeleteReport(report, e)}
                            disabled={deletingReportId === report.id}
                            className="p-1 hover:bg-red-500/20 hover:text-red-400 text-slate-400 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Eliminar informe"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showUpload && (
        <DocumentUpload
          projectId={project.id}
          onClose={() => setShowUpload(false)}
          onSuccess={() => {
            setShowUpload(false);
            loadDocuments();
          }}
        />
      )}

      {showGenerator && (
        <ReportGenerator
          project={project}
          documents={documents}
          onClose={() => setShowGenerator(false)}
          onSuccess={() => {
            setShowGenerator(false);
            loadReports();
          }}
        />
      )}

        {selectedReport && (
          <ReportViewer
            report={selectedReport}
            projectName={project.name}
            onClose={() => setSelectedReport(null)}
            onUpdate={() => {
              setSelectedReport(null);
              loadReports();
            }}
          />
        )}
    </div>
  );
}

