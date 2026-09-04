import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Generates a base64 string of a PDF from a given HTML element,
 * supporting multiple pages if children with the class 'rx-page' are found.
 */
export const generateBase64PdfFromElement = async (element: HTMLElement): Promise<string> => {
  if (!element) {
    throw new Error("Element not provided for PDF generation.");
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Find all pages if they exist
  const pages = Array.from(element.querySelectorAll('.rx-page')) as HTMLElement[];

  if (pages.length > 0) {
    for (let i = 0; i < pages.length; i++) {
      if (i > 0) pdf.addPage();
      
      const pageEl = pages[i];
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      let imgWidth = pdfWidth;
      let imgHeight = (canvas.height * pdfWidth) / canvas.width;

      if (imgHeight > pageHeight) {
        const ratio = pageHeight / imgHeight;
        imgHeight = pageHeight;
        imgWidth = imgWidth * ratio;
      }

      const x = (pdfWidth - imgWidth) / 2;
      pdf.addImage(imgData, 'PNG', x, 0, imgWidth, imgHeight);
    }
  } else {
    // Fallback for single page or elements without .rx-page
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    let imgWidth = pdfWidth;
    let imgHeight = (canvas.height * pdfWidth) / canvas.width;

    if (imgHeight > pageHeight) {
      const ratio = pageHeight / imgHeight;
      imgHeight = pageHeight;
      imgWidth = imgWidth * ratio;
    }

    const x = (pdfWidth - imgWidth) / 2;
    pdf.addImage(imgData, 'PNG', x, 0, imgWidth, imgHeight);
  }

  return pdf.output("datauristring").split(",")[1];
};

/**
 * Generates and downloads a PDF from a given HTML element.
 * 
 * @param element The HTML element to capture.
 * @param filename The desired name for the downloaded PDF file.
 */
export const generatePdfFromElement = async (element: HTMLElement, filename: string = 'document.pdf') => {
  try {
    const base64 = await generateBase64PdfFromElement(element);
    
    // Create a Blob from base64
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], {type: 'application/pdf'});
    
    // Trigger download
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
};
