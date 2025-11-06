'use client';

import { useState, useEffect } from 'react';
import { Plus, FolderOpen, Calendar, FileText, Trash2, Edit2, Check, X } from 'lucide-react';
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
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; description: string; type: Project['type'] }>({
    name: '',
    description: '',
    type: 'general'
  });
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

  const handleEditProject = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(project.id);
    setEditForm({
      name: project.name,
      description: project.description || '',
      type: project.type
    });
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(null);
    setEditForm({ name: '', description: '', type: 'general' });
  };

  const handleSaveEdit = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!editForm.name.trim()) {
      alert('El nombre del proyecto es requerido');
      return;
    }

    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: editForm.name.trim(),
          description: editForm.description.trim() || null,
          type: editForm.type,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);

      if (error) throw error;

      setEditingProjectId(null);
      loadProjects();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar el proyecto');
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
              onClick={() => editingProjectId !== project.id && onSelectProject(project)}
              className={`bg-slate-800 border border-slate-700 rounded-xl p-6 transition-all ${
                editingProjectId === project.id 
                  ? 'border-blue-500 shadow-lg shadow-blue-500/20' 
                  : 'hover:border-blue-500 cursor-pointer hover:shadow-lg hover:shadow-blue-500/10'
              }`}
            >
              {editingProjectId === project.id ? (
                // Modo Edición
                <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <label className="text-xs text-slate-400 mb-1 block">Nombre del Proyecto</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nombre del proyecto"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Tipo</label>
                    <select
                      value={editForm.type}
                      onChange={(e) => setEditForm({ ...editForm, type: e.target.value as Project['type'] })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="general">General</option>
                      <option value="financial">Financiero</option>
                      <option value="legal">Legal</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Descripción</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Descripción del proyecto (opcional)"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={(e) => handleSaveEdit(project.id, e)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      Guardar
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                // Modo Vista
                <>
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
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleEditProject(project, e)}
                        className="p-1.5 hover:bg-blue-500/20 hover:text-blue-400 text-slate-400 rounded transition-colors"
                        title="Editar proyecto"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteProject(project, e)}
                        disabled={deletingProjectId === project.id}
                        className="p-1.5 hover:bg-red-500/20 hover:text-red-400 text-slate-400 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Eliminar proyecto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                    {project.description || 'Sin descripción'}
                  </p>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="w-4 h-4" />
                    {new Date(project.updated_at).toLocaleDateString('es-ES')}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

