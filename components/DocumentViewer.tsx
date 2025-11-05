'use client';

import { useState, useEffect } from 'react';
import { X, Download, ZoomIn, ZoomOut, FileText, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Document as DocumentType } from '@/types';
import { supabase } from '@/lib/supabase';

interface DocumentViewerProps {
  document: DocumentType;
  onClose: () => void;
}

export function DocumentViewer({ document, onClose }: DocumentViewerProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDocument();
  }, [document.id]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error: downloadError } = await supabase.storage
        .from('documents')
        .createSignedUrl(document.storage_path, 3600);

      if (downloadError) throw downloadError;

      const url = data.signedUrl;

      if (document.file_type === 'image') {
        setImageUrl(url);
      } else if (document.file_type === 'pdf') {
        setPdfUrl(url);
      }

      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el documento');
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const { data, error: downloadError } = await supabase.storage
        .from('documents')
        .download(document.storage_path);

      if (downloadError) throw downloadError;

      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.filename;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Error al descargar el documento');
    }
  };


  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 rounded-xl max-w-7xl w-full max-h-[95vh] overflow-hidden border border-slate-700 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
          <div className="flex items-center gap-3">
            {document.file_type === 'image' ? (
              <ImageIcon className="w-5 h-5 text-purple-400" />
            ) : (
              <FileText className="w-5 h-5 text-red-400" />
            )}
            <div>
              <h3 className="text-white font-semibold">{document.filename}</h3>
              <p className="text-slate-400 text-sm">
                {(document.file_size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Descargar
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-slate-950 p-4 flex items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400">Cargando documento...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-6 py-4 rounded-lg">
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && imageUrl && (
            <div className="max-w-full max-h-full">
              <img
                src={imageUrl}
                alt={document.filename}
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              />
            </div>
          )}

          {!loading && !error && pdfUrl && (
            <div className="w-full h-full flex items-center justify-center">
              <iframe
                src={pdfUrl}
                className="w-full h-[85vh] border-0 rounded-lg shadow-2xl"
                title={document.filename}
              />
            </div>
          )}

          {!loading && !error && document.file_type === 'word' && (
            <div className="flex flex-col items-center gap-4 p-8">
              <AlertCircle className="w-16 h-16 text-amber-400" />
              <div className="text-center">
                <h3 className="text-white font-semibold text-lg mb-2">Documento Word</h3>
                <p className="text-slate-400 mb-4">
                  Los documentos Word no se pueden visualizar directamente en el navegador.
                </p>
                <p className="text-slate-400 text-sm mb-6">
                  Descarga el archivo para abrirlo con Microsoft Word o Google Docs.
                </p>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mx-auto"
                >
                  <Download className="w-5 h-5" />
                  Descargar Documento
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

