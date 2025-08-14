// PDF parsing utility with proper error handling
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Use require() instead of import to avoid module resolution issues
    // This is a workaround for pdf-parse's internal test file conflicts
    const pdfParse = eval('require')('pdf-parse');
    
    console.log('pdf-parse loaded successfully using require()');
    
    // Parse the PDF
    const data = await pdfParse(buffer);
    
    if (!data || !data.text) {
      throw new Error('No text extracted from PDF');
    }
    
    console.log('PDF parsed successfully, text length:', data.text.length);
    return data.text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('ENOENT') && error.message.includes('test')) {
        // This is the specific error we're trying to fix
        console.log('Detected test file error, trying alternative approach...');
        return await tryAlternativePDFParsing(buffer);
      } else if (error.message.includes('Invalid PDF')) {
        throw new Error('Invalid PDF file format');
      } else if (error.message.includes('Encrypted')) {
        throw new Error('PDF is encrypted and cannot be parsed');
      } else if (error.message.includes('Cannot find module')) {
        throw new Error('PDF parsing library not properly installed');
      } else {
        throw new Error(`PDF parsing failed: ${error.message}`);
      }
    }
    
    throw new Error('Unknown PDF parsing error');
  }
}

// Alternative parsing method as fallback
async function tryAlternativePDFParsing(buffer: Buffer): Promise<string> {
  try {
    // Try a different approach by creating a clean require context
    const Module = eval('require')('module');
    const originalRequire = Module.prototype.require;
    
    // Temporarily override require to handle the test file issue
    Module.prototype.require = function(id: string) {
      if (id.includes('test/data/')) {
        // Return empty buffer for test files
        return Buffer.alloc(0);
      }
      return originalRequire.apply(this, arguments);
    };
    
    const pdfParse = eval('require')('pdf-parse');
    
    // Restore original require
    Module.prototype.require = originalRequire;
    
    console.log('Alternative pdf-parse loading successful');
    
    const data = await pdfParse(buffer);
    
    if (!data || !data.text) {
      throw new Error('No text extracted from PDF using alternative method');
    }
    
    return data.text;
  } catch (altError) {
    console.error('Alternative PDF parsing also failed:', altError);
    throw new Error('PDF parsing failed with both primary and alternative methods. The PDF might be image-based, encrypted, or corrupted.');
  }
}
