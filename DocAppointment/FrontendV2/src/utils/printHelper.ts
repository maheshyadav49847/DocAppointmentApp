import toast from 'react-hot-toast';
import { billingService } from '@/services/billingService';

export const handlePrintInvoice = async (invoiceId: string, organizationId: string, activeBranch: any) => {
  const loadingToast = toast.loading('Fetching invoice details...');
  try {
    const fullInv = await billingService.getInvoiceById(invoiceId, organizationId);
    toast.dismiss(loadingToast);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    // Fallbacks if fullInv doesn't have top-level properties (it usually does from GetInvoiceById query)
    const inv = fullInv;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${inv.invoiceNumber}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
            .header h1 { margin: 0; color: #111; font-size: 28px; }
            .header p { color: #666; margin-top: 5px; }
            .details { margin-bottom: 30px; display: flex; justify-content: space-between; background: #f8fafc; padding: 15px; border-radius: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border-bottom: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f8fafc; color: #475569; font-weight: 600; }
            .totals { margin-top: 30px; text-align: right; width: 300px; margin-left: auto; }
            .totals p { display: flex; justify-content: space-between; margin: 8px 0; color: #64748b; }
            .totals h3 { display: flex; justify-content: space-between; margin: 10px 0; color: #0f172a; font-size: 18px; }
            .totals .balance { color: #e11d48; border-top: 2px solid #eee; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header" style="display: flex; justify-content: space-between; text-align: left; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 20px;">
            <div style="display: flex; gap: 15px; align-items: center;">
              ${activeBranch && activeBranch.logoBase64 ? 
                `<img src="${activeBranch.logoBase64}" style="max-width: 80px; max-height: 80px; object-fit: contain; border-radius: 8px;" alt="Clinic Logo" />` : 
                ''}
              <div>
                <div style="font-size: 26px; font-weight: 900; color: #1e1b4b; letter-spacing: -0.5px; margin-bottom: 4px;">${activeBranch ? activeBranch.name : 'Clinic Invoice'}</div>
                ${activeBranch && activeBranch.address ? `<div style="color: #64748b; font-size: 13px; margin-top: 2px;">${activeBranch.address}</div>` : ''}
                ${activeBranch && activeBranch.whatsAppNumber ? `<div style="color: #64748b; font-size: 13px;">Phone: ${activeBranch.whatsAppNumber}</div>` : ''}
              </div>
            </div>
            <div style="text-align: right;">
              <h1 style="margin: 0; color: #0f172a; font-size: 32px;">INVOICE</h1>
              <div style="color: #64748b; font-size: 14px; margin-top: 4px;"># ${inv.invoiceNumber || 'INV-0000'}</div>
            </div>
          </div>
          <div class="details">
            <div>
              <strong>Patient:</strong> ${inv.patientName}<br/>
              <strong>Date:</strong> ${new Date(inv.createdAt).toLocaleDateString()}
            </div>
            <div style="text-align: right;">
              <strong>Status:</strong> ${inv.status === 2 ? 'PAID' : inv.status === 1 ? 'PARTIAL' : 'UNPAID'}<br/>
              <strong>Total Billed:</strong> ₹${inv.totalAmount}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Service Details</th>
                <th style="text-align:right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${fullInv.items && fullInv.items.length > 0 ? fullInv.items.map((item: any) => `
                <tr>
                  <td>${item.itemName} <small>x ${item.quantity}</small></td>
                  <td style="text-align:right">₹${item.unitPrice * item.quantity}</td>
                </tr>
              `).join('') : `<tr><td>Clinical Services & Consultation</td><td style="text-align:right">₹${inv.totalAmount + (inv.discountAmount||0) - (inv.taxAmount||0)}</td></tr>`}
            </tbody>
          </table>
          <div class="totals">
            <p><span>Subtotal:</span> <span>₹${inv.totalAmount + (inv.discountAmount||0) - (inv.taxAmount||0)}</span></p>
            <p><span>Discount:</span> <span>₹${inv.discountAmount || 0}</span></p>
            <p><span>Tax:</span> <span>₹${inv.taxAmount || 0}</span></p>
            <h3><span>Total:</span> <span>₹${inv.totalAmount}</span></h3>
            <h3><span>Paid:</span> <span style="color: #10b981;">₹${inv.paidAmount}</span></h3>
            ${inv.totalAmount - inv.paidAmount > 0 ? `<h3 class="balance"><span>Balance Due:</span> <span>₹${inv.totalAmount - inv.paidAmount}</span></h3>` : ''}
          </div>
          <div style="margin-top: 50px; text-align: center; color: #94a3b8; font-size: 12px;">
            <p>Thank you for your visit. Get well soon!</p>
          </div>
          <script>
            window.onload = () => { window.print(); window.setTimeout(() => window.close(), 500); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  } catch (error) {
    toast.dismiss(loadingToast);
    toast.error('Failed to load invoice details');
  }
};
