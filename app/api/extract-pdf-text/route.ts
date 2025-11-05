import { NextRequest, NextResponse } from 'next/server';

// Cargar pdf-extract.cjs usando Function constructor para evitar webpack
// Esto fuerza que se ejecute en runtime de Node.js
const loadPdfExtract = () => {
  // Usar Function constructor para construir el require dinámicamente
  // webpack no puede analizar esto estáticamente
  const requireFunc = new Function('path', `
    const pathModule = require('path');
    const fs = require('fs');
    const fullPath = pathModule.join(process.cwd(), 'lib', 'pdf-extract.cjs');
    if (!fs.existsSync(fullPath)) {
      throw new Error('pdf-extract.cjs no encontrado en: ' + fullPath);
    }
    return require(fullPath);
  `);
  
  return requireFunc();
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó un archivo' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'El archivo debe ser un PDF' },
        { status: 400 }
      );
    }

    // Convertir File a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Cargar y usar el módulo CommonJS directamente
    const pdfExtract = loadPdfExtract();
    const pdfData = await pdfExtract.extractPdfText(buffer);
    
    return NextResponse.json({
      text: pdfData.text || '',
      pages: pdfData.pages || 0,
      info: pdfData.info || {},
    });
  } catch (error: any) {
    console.error('Error extrayendo texto del PDF:', error);
    
    // Si pdf-parse no está disponible, intentar con pdfjs-dist como fallback
    if (error.message?.includes('Cannot find module') || error.message?.includes('pdf-parse')) {
      try {
        // Fallback: usar una solución más simple o informar al usuario
        return NextResponse.json(
          { 
            error: 'pdf-parse no está instalado. Por favor ejecuta: npm install pdf-parse',
            fallback: true 
          },
          { status: 500 }
        );
      } catch (fallbackError: any) {
        return NextResponse.json(
          { error: `Error al extraer texto del PDF: ${error.message}` },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: `Error al extraer texto del PDF: ${error.message}` },
      { status: 500 }
    );
  }
}

