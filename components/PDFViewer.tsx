'use client';

import { useState, useEffect } from 'react';
import { Document as PDFDocument, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configurar worker de PDF.js solo en el cliente
if (typeof window !== 'undefined') {
  // Configurar el worker usando la versión correcta
  // Usar el worker desde unpkg con la versión específica de pdfjs
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
}

interface PDFViewerProps {
  pdfUrl: string;
  pageNumber: number;
  scale: number;
  onLoadSuccess: (data: { numPages: number }) => void;
}

export function PDFViewer({ pdfUrl, pageNumber, scale, onLoadSuccess }: PDFViewerProps) {
  const [error, setError] = useState<string | null>(null);

  const handleLoadError = (error: Error) => {
    console.error('Error loading PDF:', error);
    setError(error.message || 'Error al cargar el PDF');
  };

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-6 py-4 rounded-lg">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <PDFDocument
      file={pdfUrl}
      onLoadSuccess={onLoadSuccess}
      onLoadError={handleLoadError}
      loading={
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400">Cargando PDF...</p>
        </div>
      }
      error={
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-6 py-4 rounded-lg">
          <p>Error al cargar el PDF</p>
        </div>
      }
      options={{
        cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
      }}
    >
      <Page
        pageNumber={pageNumber}
        scale={scale}
        renderTextLayer={true}
        renderAnnotationLayer={true}
        className="shadow-2xl rounded-lg"
      />
    </PDFDocument>
  );
}

