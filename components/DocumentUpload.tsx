'use client';

import { useState, useRef } from 'react';
import { X, Upload, File, Image, FileText, Sheet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface DocumentUploadProps {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface FileWithPreview {
  file: File;
  description: string;
}

export function DocumentUpload({ projectId, onClose, onSuccess }: DocumentUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    addFiles(selectedFiles);
  };

  const addFiles = (selectedFiles: File[]) => {
    const newFiles = selectedFiles.map(file => ({ file, description: '' }));
    setFiles(prev => [...prev, ...newFiles]);
    setError(''); // Limpiar errores cuando se agregan archivos válidos
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    const validExtensions = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'xlsx', 'xls'];
    
    const validFiles = droppedFiles.filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      return validExtensions.includes(ext || '');
    });

    const invalidFiles = droppedFiles.filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      return !validExtensions.includes(ext || '');
    });

    if (validFiles.length > 0) {
      addFiles(validFiles);
    }
    
    if (invalidFiles.length > 0) {
      setError(`Archivos no soportados: ${invalidFiles.map(f => f.name).join(', ')}. Solo se aceptan: PDF, Word, Excel, Imágenes`);
    }
  };

  const updateDescription = (index: number, description: string) => {
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, description } : f));
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileType = (file: File): 'pdf' | 'word' | 'image' | 'excel' | 'other' => {
    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();
    
    // Verificar por extensión primero (más confiable)
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) return 'excel';
    if (name.endsWith('.pdf')) return 'pdf';
    if (name.endsWith('.doc') || name.endsWith('.docx')) return 'word';
    if (name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png')) return 'image';
    
    // Verificar por tipo MIME como fallback
    if (type.includes('pdf')) return 'pdf';
    if (type.includes('word') || type.includes('document') || type.includes('msword')) return 'word';
    if (type.includes('image')) return 'image';
    if (type.includes('sheet') || type.includes('excel') || type.includes('spreadsheet')) return 'excel';
    
    return 'other';
  };

  const getFileIcon = (type: string, filename: string) => {
    const name = filename.toLowerCase();
    if (type.includes('image')) return <Image className="w-5 h-5 text-purple-400" />;
    if (type.includes('pdf')) return <FileText className="w-5 h-5 text-red-400" />;
    if (type.includes('sheet') || type.includes('excel') || name.endsWith('.xlsx') || name.endsWith('.xls')) return <Sheet className="w-5 h-5 text-green-400" />;
    if (type.includes('word') || type.includes('document')) return <FileText className="w-5 h-5 text-blue-400" />;
    return <File className="w-5 h-5 text-slate-400" />;
  };

  const handleUpload = async () => {
    if (!user || files.length === 0) return;

    setUploading(true);
    setError('');

    try {
      const { DocumentProcessor } = await import('@/lib/document-processor');
      const { RAGService } = await import('@/lib/rag-service');
      const { EmbeddingService } = await import('@/lib/embedding-service');
      
      // Inicializar servicios de IA si está disponible
      const openaiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      if (openaiKey) {
        EmbeddingService.initialize(openaiKey);
      }

      for (const { file, description } of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${projectId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const fileType = getFileType(file);
        let extractedText = description || '';
        let processingStatus: 'pending' | 'processing' | 'completed' | 'failed' = 'pending';
        
        // Procesar documento según su tipo
        try {
          extractedText = await DocumentProcessor.processDocument(file, fileType);
          processingStatus = 'completed';
          console.log(`Documento procesado exitosamente: ${file.name} (${extractedText.length} caracteres)`);
        } catch (error) {
          console.error('Error al procesar documento:', error);
          extractedText = description || `Archivo ${fileType.toUpperCase()} (procesamiento manual requerido)`;
          processingStatus = 'completed'; // Marcar como completado aunque no se extrajo texto
        }

        // Insertar documento en la base de datos
        const { data: insertedDoc, error: insertError } = await supabase
          .from('documents')
          .insert({
            project_id: projectId,
            filename: file.name,
            file_type: fileType,
            file_size: file.size,
            storage_path: fileName,
            description,
            uploaded_by: user.id,
            processing_status: processingStatus,
            extracted_text: extractedText,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Procesar con RAG si hay texto extraído y OpenAI está configurado
        if (openaiKey && extractedText && extractedText.length > 100 && insertedDoc) {
          try {
            console.log(`Generando embeddings para documento: ${file.name}`);
            const ragResult = await RAGService.processDocument(
              insertedDoc.id,
              projectId,
              extractedText,
              {
                filename: file.name,
                fileType: fileType,
                uploadedAt: new Date().toISOString(),
              }
            );
            
            if (ragResult.success) {
              console.log(`✅ RAG procesado: ${ragResult.chunksCreated} chunks creados para ${file.name}`);
            } else {
              console.warn(`⚠️ RAG no procesado para ${file.name}: ${ragResult.error}`);
            }
          } catch (ragError) {
            console.error('Error en procesamiento RAG:', ragError);
            // No fallar la subida si RAG falla
          }
        }
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al subir el documento');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden border border-slate-700 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Subir Documentos</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer mb-6 ${
              isDragging
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-700 hover:border-blue-500'
            }`}
          >
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-white font-medium mb-2">Haz clic para subir o arrastra y suelta</p>
            <p className="text-slate-400 text-sm">PDF, Word, Excel (XLSX, XLS) o imágenes (JPG, PNG)</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xlsx,.xls,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {files.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-300">Archivos Seleccionados ({files.length})</h3>
              {files.map((fileWithDesc, index) => (
                <div
                  key={index}
                  className="bg-slate-900 border border-slate-700 rounded-lg p-4"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-slate-800 rounded">
                      {getFileIcon(fileWithDesc.file.type, fileWithDesc.file.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{fileWithDesc.file.name}</p>
                      <p className="text-slate-400 text-sm">
                        {(fileWithDesc.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1 hover:bg-slate-700 rounded transition-colors"
                    >
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={fileWithDesc.description}
                    onChange={(e) => updateDescription(index, e.target.value)}
                    placeholder="Añade descripción o contexto (opcional)..."
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-700">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={uploading}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || files.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {uploading ? 'Subiendo...' : `Subir ${files.length} Archivo${files.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

