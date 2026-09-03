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
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
            body { font-family: 'Inter', system-ui, sans-serif; padding: 40px; color: #334155; max-width: 800px; margin: 0 auto; background: #fff; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px dashed #e2e8f0; margin-bottom: 24px; }
            .clinic-info { display: flex; gap: 16px; align-items: center; }
            .clinic-name { font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; text-transform: uppercase; margin-bottom: 4px; }
            .clinic-contact { color: #64748b; font-size: 13px; font-weight: 500; }
            .invoice-title { text-align: right; }
            .invoice-title h1 { margin: 0; color: #0f172a; font-size: 32px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; }
            .invoice-title p { color: #64748b; font-size: 14px; font-weight: 600; margin-top: 4px; }
            
            .details { display: grid; grid-template-columns: 1fr auto; gap: 24px; padding-bottom: 20px; border-bottom: 2px dashed #e2e8f0; margin-bottom: 32px; }
            .detail-group { display: flex; gap: 12px; margin-bottom: 12px; }
            .detail-label { width: 100px; color: #64748b; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
            .detail-value { font-weight: 700; color: #0f172a; font-size: 14px; }
            
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
            .status-paid { background: #d1fae5; color: #047857; }
            .status-partial { background: #fef3c7; color: #b45309; }
            .status-unpaid { background: #ffe4e6; color: #be123c; }

            .table-header { color: #94a3b8; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
            th, td { padding: 16px 0; text-align: left; border-bottom: 1px solid #f1f5f9; }
            th { color: #64748b; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 12px 0; }
            td { font-size: 14px; color: #0f172a; font-weight: 600; vertical-align: top; }
            .item-name { font-weight: 700; color: #0f172a; font-size: 14px; text-transform: uppercase; }
            
            .totals-container { display: flex; justify-content: flex-end; }
            .totals { width: 350px; }
            .totals-row { display: flex; justify-content: space-between; padding: 10px 0; color: #64748b; font-size: 14px; font-weight: 600; }
            .totals-row.main { color: #0f172a; font-size: 16px; font-weight: 800; border-top: 2px dashed #e2e8f0; border-bottom: 2px dashed #e2e8f0; padding: 16px 0; margin: 8px 0; }
            .totals-row.paid { color: #059669; font-size: 15px; font-weight: 700; }
            .totals-row.balance { color: #e11d48; font-size: 15px; font-weight: 700; border-top: 1px solid #f1f5f9; margin-top: 4px; padding-top: 12px; }
            
            .signature-area { display: flex; justify-content: flex-end; margin-top: 80px; margin-bottom: 30px; }
            .signature-box { width: 240px; text-align: center; }
            .signature-line { border-bottom: 1px solid #94a3b8; margin-bottom: 12px; }
            .signature-label { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
            
            .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px; font-weight: 600; border-top: 2px dashed #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="clinic-info">
              ${activeBranch && activeBranch.logoBase64 ? 
                `<img src="${activeBranch.logoBase64}" style="max-width: 70px; max-height: 70px; object-fit: contain; border-radius: 8px;" alt="Logo" />` : 
                ''}
              <div>
                <div class="clinic-name">${activeBranch ? activeBranch.name : 'CLINIC INVOICE'}</div>
                ${activeBranch && activeBranch.address ? `<div class="clinic-contact">${activeBranch.address}</div>` : ''}
                ${activeBranch && activeBranch.whatsAppNumber ? `<div class="clinic-contact">Phone: ${activeBranch.whatsAppNumber}</div>` : ''}
              </div>
            </div>
            <div class="invoice-title">
              <h1>INVOICE</h1>
              <p># ${inv.invoiceNumber || 'INV-0000'}</p>
            </div>
          </div>
          
          <div class="details">
            <div>
              <div class="detail-group">
                <div class="detail-label">Patient Name:</div>
                <div class="detail-value">${inv.patientName}</div>
              </div>
              <div class="detail-group">
                <div class="detail-label">Invoice Date:</div>
                <div class="detail-value">${new Date(inv.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</div>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="margin-bottom: 12px;">
                <span class="status-badge ${inv.status === 2 ? 'status-paid' : inv.status === 1 ? 'status-partial' : 'status-unpaid'}">
                  ${inv.status === 2 ? 'PAID' : inv.status === 1 ? 'PARTIAL' : 'UNPAID'}
                </span>
              </div>
              <div class="detail-group" style="justify-content: flex-end;">
                <div class="detail-label" style="width: auto; margin-right: 12px;">Total Billed:</div>
                <div class="detail-value" style="font-size: 16px; font-weight: 800;">₹${inv.totalAmount}</div>
              </div>
            </div>
          </div>
          
          <div class="table-header">Billed Items</div>
          <table>
            <thead>
              <tr>
                <th style="width: 5%">#</th>
                <th style="width: 55%">Service Details</th>
                <th style="width: 20%; text-align: center;">Qty x Price</th>
                <th style="width: 20%; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${fullInv.items && fullInv.items.length > 0 ? fullInv.items.map((item: any, i: number) => `
                <tr>
                  <td style="color: #64748b;">${i + 1}.</td>
                  <td>
                    <div class="item-name">${item.itemName}</div>
                  </td>
                  <td style="text-align: center; color: #64748b;">${item.quantity} × ₹${item.unitPrice}</td>
                  <td style="text-align: right;">₹${item.unitPrice * item.quantity}</td>
                </tr>
              `).join('') : `
                <tr>
                  <td style="color: #64748b;">1.</td>
                  <td><div class="item-name">Clinical Services & Consultation</div></td>
                  <td style="text-align: center; color: #64748b;">1 × ₹${inv.totalAmount + (inv.discountAmount||0) - (inv.taxAmount||0)}</td>
                  <td style="text-align: right;">₹${inv.totalAmount + (inv.discountAmount||0) - (inv.taxAmount||0)}</td>
                </tr>
              `}
            </tbody>
          </table>
          
          <div class="totals-container">
            <div class="totals">
              <div class="totals-row">
                <span>Subtotal</span> <span>₹${inv.totalAmount + (inv.discountAmount||0) - (inv.taxAmount||0)}</span>
              </div>
              <div class="totals-row">
                <span>Discount</span> <span>₹${inv.discountAmount || 0}</span>
              </div>
              <div class="totals-row">
                <span>Tax</span> <span>₹${inv.taxAmount || 0}</span>
              </div>
              <div class="totals-row main">
                <span>TOTAL AMOUNT</span> <span>₹${inv.totalAmount}</span>
              </div>
              <div class="totals-row paid">
                <span>Amount Paid</span> <span>₹${inv.paidAmount}</span>
              </div>
              ${inv.totalAmount - inv.paidAmount > 0 ? `
              <div class="totals-row balance">
                <span>Balance Due</span> <span>₹${inv.totalAmount - inv.paidAmount}</span>
              </div>` : ''}
            </div>
          </div>
          
          <div class="signature-area">
            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-label">Authorized Signature & Stamp</div>
            </div>
          </div>
          
          <div class="footer">
            Thank you for your visit. Get well soon!
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
