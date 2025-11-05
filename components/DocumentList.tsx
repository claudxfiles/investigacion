'use client';

import { useState } from 'react';
import { File, Image, FileText, Clock, CheckCircle, AlertCircle, XCircle, Eye, Edit, Trash2, Sparkles } from 'lucide-react';
import { Document } from '@/types';
import { supabase } from '@/lib/supabase';
import { DocumentViewer } from './DocumentViewer';
import { DocumentEditor } from './DocumentEditor';

interface DocumentListProps {
  documents: Document[];
  onUpdate: () => void;
}

export function DocumentList({ documents, onUpdate }: DocumentListProps) {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [deletingDocument, setDeletingDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(false);
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="w-5 h-5 text-purple-400" />;
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-400" />;
      case 'word':
        return <FileText className="w-5 h-5 text-blue-400" />;
      default:
        return <File className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusIcon = (status: Document['processing_status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-400 animate-pulse" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-amber-400" />;
    }
  };

  const getStatusLabel = (status: Document['processing_status']) => {
    switch (status) {
      case 'completed': return 'Completado';
      case 'processing': return 'Procesando';
      case 'failed': return 'Fallido';
      default: return 'Pendiente';
    }
  };

  const handleDelete = async (document: Document) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar "${document.filename}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    setLoading(true);
    try {
      // Eliminar archivo del storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([document.storage_path]);

      if (storageError) throw storageError;

      // Eliminar registro de la base de datos
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .eq('id', document.id);

      if (deleteError) throw deleteError;

      onUpdate();
      setDeletingDocument(null);
    } catch (err: any) {
      alert(err.message || 'Error al eliminar el documento');
    } finally {
      setLoading(false);
    }
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">Aún no se han subido documentos</p>
        <p className="text-slate-500 text-sm mt-2">Sube tu primer documento para comenzar</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="bg-slate-900 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
        >
          <div className="flex items-start gap-4">
            <div className="p-2 bg-slate-800 rounded">
              {getFileIcon(doc.file_type)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="text-white font-medium truncate cursor-pointer hover:text-blue-400" onClick={() => setSelectedDocument(doc)}>
                    {doc.filename}
                  </h4>
                  <p className="text-slate-400 text-sm mt-1">
                    {(doc.file_size / 1024 / 1024).toFixed(2)} MB • Subido {new Date(doc.uploaded_at).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {getStatusIcon(doc.processing_status)}
                  <span className="text-sm text-slate-400">{getStatusLabel(doc.processing_status)}</span>
                </div>
              </div>

              {doc.description && (
                <p className="text-slate-300 text-sm mt-2 bg-slate-800 rounded px-3 py-2">
                  {doc.description}
                </p>
              )}

              {/* Botones de acción */}
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => setSelectedDocument(doc)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/50 rounded-lg text-sm transition-colors"
                  title="Ver documento"
                >
                  <Eye className="w-4 h-4" />
                  Ver
                </button>
                <button
                  onClick={() => setEditingDocument(doc)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-600/50 rounded-lg text-sm transition-colors"
                  title="Editar documento"
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(doc)}
                  disabled={loading}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/50 rounded-lg text-sm transition-colors disabled:opacity-50"
                  title="Eliminar documento"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Visor de documentos */}
      {selectedDocument && (
        <DocumentViewer
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
        />
      )}

      {/* Editor de documentos */}
      {editingDocument && (
        <DocumentEditor
          document={editingDocument}
          onClose={() => setEditingDocument(null)}
          onSuccess={() => {
            setEditingDocument(null);
            onUpdate();
          }}
        />
      )}
    </div>
  );
}

