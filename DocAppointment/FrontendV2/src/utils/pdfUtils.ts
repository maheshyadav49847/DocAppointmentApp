import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Generates and downloads a PDF from a given HTML element.
 * 
 * @param element The HTML element to capture.
 * @param filename The desired name for the downloaded PDF file.
 */
export const generatePdfFromElement = async (element: HTMLElement, filename: string = 'document.pdf') => {
  if (!element) {
    throw new Error("Element not provided for PDF generation.");
  }

  // Ensure element is visible momentarily if it's hidden via display:none.
  // Note: If using position: absolute and left: -9999px, it will capture correctly.
  
  try {
    const canvas = await html2canvas(element, {
      scale: 2, // Higher scale for better quality
      useCORS: true, // Attempt to load cross-origin images
      logging: false, // Turn off console logging
      backgroundColor: '#ffffff' // Ensure white background
    });

    const imgData = canvas.toDataURL('image/png');
    
    // A4 size is 210mm x 297mm
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let imgWidth = pdfWidth;
    let imgHeight = (canvas.height * pdfWidth) / canvas.width;

    if (imgHeight > pageHeight) {
      const ratio = pageHeight / imgHeight;
      imgHeight = pageHeight;
      imgWidth = imgWidth * ratio;
    }
    
    const x = (pdfWidth - imgWidth) / 2;
    pdf.addImage(imgData, 'PNG', x, 0, imgWidth, imgHeight);
    pdf.save(filename);
    
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
};
