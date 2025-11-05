/**
 * Servicio de extracción de PDF para uso en el servidor
 * Este archivo se ejecuta solo en el servidor, no en el cliente
 */

import { createRequire } from 'module';
import { join } from 'path';

// Cargar el módulo CommonJS que tiene pdf-parse
// Next.js no procesará archivos .cjs con webpack
export async function extractPdfText(buffer: Buffer): Promise<{ text: string; pages: number; info: any }> {
  try {
    // Usar createRequire con process.cwd() y path absoluto
    const requireModule = createRequire(join(process.cwd(), 'package.json'));
    
    // Cargar el módulo CommonJS usando path absoluto
    const pdfExtractPath = join(process.cwd(), 'lib', 'pdf-extract.cjs');
    const pdfExtract = requireModule(pdfExtractPath);
    
    return await pdfExtract.extractPdfText(buffer);
  } catch (error: any) {
    // Fallback: intentar require directo si createRequire falla
    try {
      // @ts-ignore - require está disponible en Node.js
      const pdfExtractPath = join(process.cwd(), 'lib', 'pdf-extract.cjs');
      // @ts-ignore
      const pdfExtract = require(pdfExtractPath);
      return await pdfExtract.extractPdfText(buffer);
    } catch (fallbackError: any) {
      throw new Error(`Error cargando pdf-extract.cjs: ${error.message}. Fallback: ${fallbackError.message}`);
    }
  }
}

