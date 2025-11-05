'use client';

import { useState } from 'react';
import { X, Save, FileText } from 'lucide-react';
import { Document as DocumentType } from '@/types';
import { supabase } from '@/lib/supabase';

interface DocumentEditorProps {
  document: DocumentType;
  onClose: () => void;
  onSuccess: () => void;
}

export function DocumentEditor({ document, onClose, onSuccess }: DocumentEditorProps) {
  const [description, setDescription] = useState(document.description || '');
  const [extractedText, setExtractedText] = useState(document.extracted_text || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          description,
          extracted_text: extractedText,
          updated_at: new Date().toISOString(),
        })
        .eq('id', document.id);

      if (updateError) throw updateError;

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-xl max-w-3xl w-full border border-slate-700">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Editar Documento</h2>
              <p className="text-slate-400 text-sm">{document.filename}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Descripción del Documento
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Añade una descripción o contexto sobre este documento..."
            />
            <p className="text-slate-400 text-xs mt-1">
              Esta descripción será utilizada para el análisis y generación de informes.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Contenido Extraído / Notas del Analista
            </label>
            <textarea
              value={extractedText}
              onChange={(e) => setExtractedText(e.target.value)}
              rows={10}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="Pega aquí el texto extraído del documento, resumen manual, notas de análisis, o cualquier información relevante que deba ser considerada en el análisis..."
            />
            <p className="text-slate-400 text-xs mt-1">
              Este contenido será utilizado por la IA para generar análisis más precisos. Puedes pegar texto extraído manualmente o escribir notas del analista.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

