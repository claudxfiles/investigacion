// Archivo CommonJS que Next.js no procesará con webpack
// Este archivo se carga directamente en Node.js runtime

const pdfParse = require('pdf-parse');

module.exports = {
  extractPdfText: async function(buffer) {
    const pdfData = await pdfParse(buffer);
    return {
      text: pdfData.text || '',
      pages: pdfData.numpages || 0,
      info: pdfData.info || {},
    };
  }
};

