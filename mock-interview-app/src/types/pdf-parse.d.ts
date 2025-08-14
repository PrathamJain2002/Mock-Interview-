declare module 'pdf-parse' {
  interface PDFData {
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    text: string;
    version: string;
  }

  interface PDFParseOptions {
    version?: string;
    password?: string;
    max?: number;
  }

  function pdfParse(dataBuffer: Buffer, options?: PDFParseOptions): Promise<PDFData>;
  
  export = pdfParse;
  export default pdfParse;
}
