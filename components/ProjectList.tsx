'use client';

import { useState, useEffect } from 'react';
import { Plus, FolderOpen, Calendar, FileText, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Project } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface ProjectListProps {
  onSelectProject: (project: Project) => void;
  onCreateProject: () => void;
}

export function ProjectList({ onSelectProject, onCreateProject }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('status', 'active')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error al cargar proyectos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: Project['type']) => {
    switch (type) {
      case 'financial':
        return 'bg-green-500/10 text-green-400 border-green-500/50';
      case 'legal':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/50';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/50';
    }
  };

  const getTypeLabel = (type: Project['type']) => {
    switch (type) {
      case 'financial':
        return 'Financiero';
      case 'legal':
        return 'Legal';
      default:
        return 'General';
    }
  };

  const handleDeleteProject = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que se seleccione el proyecto al hacer clic en eliminar
    
    if (!confirm(`¿Estás seguro de que deseas eliminar el proyecto "${project.name}"? Esta acción eliminará todos los documentos e informes asociados y no se puede deshacer.`)) {
      return;
    }

    setDeletingProjectId(project.id);
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);

      if (error) throw error;

      loadProjects();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar el proyecto');
    } finally {
      setDeletingProjectId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Proyectos</h2>
        <button
          onClick={onCreateProject}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuevo Proyecto
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16 bg-slate-800 rounded-xl border border-slate-700">
          <FolderOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Aún No Hay Proyectos</h3>
          <p className="text-slate-400 mb-6">Crea tu primer proyecto para comenzar a analizar documentos</p>
          <button
            onClick={onCreateProject}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Crear Proyecto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => onSelectProject(project)}
              className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-blue-500 cursor-pointer transition-all hover:shadow-lg hover:shadow-blue-500/10"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600/20 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                    <span className={`inline-block mt-1 px-2 py-1 text-xs border rounded ${getTypeColor(project.type)}`}>
                      {getTypeLabel(project.type)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteProject(project, e)}
                  disabled={deletingProjectId === project.id}
                  className="p-1.5 hover:bg-red-500/20 hover:text-red-400 text-slate-400 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Eliminar proyecto"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                {project.description || 'Sin descripción'}
              </p>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Calendar className="w-4 h-4" />
                {new Date(project.updated_at).toLocaleDateString('es-ES')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

