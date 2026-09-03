import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/axios';
import { PageLoader } from '@/components/ui/PageLoader';
import { Plus, Printer, CheckCircle, Search, X, FileText, Receipt, Trash2, CreditCard, User, Activity } from 'lucide-react';
import { billingService, type ServiceItem } from '@/services/billingService';
import toast from 'react-hot-toast';
import { branchService } from '@/services/branchService';

export default function BillingDashboardPage() {
  const { user, activeBranchId } = useAuthStore();
  const organizationId = user?.orgId || '';
  const branchId = activeBranchId || '';
  const queryClient = useQueryClient();
  const { data: myBranches = [] } = useQuery({
    queryKey: ['my-branches'],
    queryFn: () => branchService.getMyBranches(),
  });
  const activeBranch = myBranches.find(b => b.id === branchId);

  const [searchParams] = useSearchParams();
  const initialPatientId = searchParams.get('patientId') || '';

  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  
  // State for Create Invoice
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [cart, setCart] = useState<{service: ServiceItem, quantity: number, isPrescribed: boolean}[]>([]);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPatientDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Services for Rate List
  const { data: services } = useQuery({
    queryKey: ['billing-services', organizationId],
    queryFn: () => billingService.getServices(organizationId),
    enabled: !!organizationId
  });

  // Fetch today's patients (Searchable)
  const { data: patientsList } = useQuery({
    queryKey: ['queuePatients', branchId, patientSearchTerm],
    queryFn: async () => {
      const url = patientSearchTerm 
        ? '/queue/search-patients?branchId=' + branchId + '&search=' + encodeURIComponent(patientSearchTerm)
        : '/queue/search-patients?branchId=' + branchId;
      const res = await api.get(url);
      return res.data;
    },
    enabled: !!branchId
  });

  // Fetch Invoices History
  const { data: invoices, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['invoices', branchId],
    queryFn: async () => {
      const start = new Date(); start.setDate(start.getDate() - 30);
      const end = new Date();
      const res = await api.get('/billing/invoices?organizationId=' + organizationId + '&branchId=' + branchId + '&startDate=' + start.toISOString() + '&endDate=' + end.toISOString());
      return res.data;
    },
    enabled: !!branchId && activeTab === 'history'
  });

  // Auto-populate prescribed services
  useEffect(() => {
    if (!selectedPatientId || !services || services.length === 0) return;

    const fetchLatestVisit = async () => {
      try {
        const res = await api.get(`/patientclinical/${selectedPatientId}/visits?page=1&limit=1`);
        if (res.data && res.data.data && res.data.data.length > 0) {
          const latestVisit = res.data.data[0];
          
          const visitDate = new Date(latestVisit.visitDate);
          const today = new Date();
          if (visitDate.toDateString() === today.toDateString()) {
             if (latestVisit.services && latestVisit.services.length > 0) {
               const invoiceRes = await api.get(`/billing/invoices?organizationId=${organizationId}&branchId=${branchId}`);
               const invoicesForToday = invoiceRes.data?.filter((i: any) => i.patientId === selectedPatientId && new Date(i.createdAt).toDateString() === today.toDateString()) || [];
               
               if (invoicesForToday.length === 0) {
                  const prescribedCart = latestVisit.services.map((vs: any) => {
                     const matchedSvc = services.find((s: any) => s.id === vs.serviceItemId);
                     if (matchedSvc) {
                        return { service: matchedSvc, quantity: vs.quantity, isPrescribed: true };
                     }
                     return null;
                  }).filter(Boolean);

                  if (prescribedCart.length > 0) {
                     setCart(prev => {
                       const newItems = prescribedCart.filter((pc: any) => !prev.some(c => c.service.id === pc.service.id));
                       if (newItems.length > 0) toast.success(`Auto-added ${newItems.length} prescribed services to bill`);
                       return [...prev, ...newItems];
                     });
                     if (latestVisit.doctorId) setSelectedDoctorId(latestVisit.doctorId);
                     if (latestVisit.tokenId) setSelectedTokenId(latestVisit.tokenId);
                  }
               }
             }
          }
        }
      } catch (err) {
        console.error("Failed to fetch prescribed services", err);
      }
    };
    fetchLatestVisit();
  }, [selectedPatientId, services]);

  const createInvoiceMut = useMutation({
    mutationFn: async () => {
      if (!selectedPatientId) throw new Error("Select a patient");
      if (cart.length === 0) throw new Error("Add at least one item to bill");
      
      const payload = {
        organizationId,
        branchId,
        patientId: selectedPatientId,
        tokenId: selectedTokenId,
        doctorId: selectedDoctorId,
        discountAmount: discount,
        taxAmount: tax,
        items: cart.map(c => ({
          serviceItemId: c.service.id,
          itemName: c.service.name,
          quantity: c.quantity,
          unitPrice: c.service.defaultPrice,
          isPrescribed: c.isPrescribed
        }))
      };
      
      const res = await api.post('/billing/invoices', payload);
      return res.data; 
    },
    onSuccess: (invoiceId) => {
      toast.success("Invoice created successfully!");
      setCart([]);
      setSelectedPatientId('');
      setPatientSearchTerm('');
      setDiscount(0);
      setTax(0);
      setActiveTab('history');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create invoice");
    }
  });

  const payInvoiceMut = useMutation({
    mutationFn: async (data: {invoiceId: string, amount: number, mode: number}) => {
      await api.post('/billing/invoices/pay', {
        invoiceId: data.invoiceId,
        organizationId,
        amount: data.amount,
        paymentMode: data.mode
      });
    },
    onSuccess: () => {
      toast.success("Payment recorded!");
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });

  const addToCart = (service: ServiceItem, isPrescribed: boolean = false) => {
    const existing = cart.find(c => c.service.id === service.id);
    if (existing) {
      toast.error(`${service.name} is already added to the bill.`);
      return;
    }
    setCart([...cart, { service, quantity: 1, isPrescribed }]);
  };

  const updateQuantity = (index: number, delta: number) => {
    const newCart = [...cart];
    newCart[index].quantity += delta;
    if (newCart[index].quantity <= 0) {
      removeFromCart(index);
    } else {
      setCart(newCart);
    }
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const subTotal = cart.reduce((acc, curr) => acc + (curr.service.defaultPrice * curr.quantity), 0);
  const total = subTotal - discount + tax;


  const handlePrint = async (inv: any) => {
    const loadingToast = toast.loading('Fetching invoice details...');
    try {
      const fullInv = await billingService.getInvoiceById(inv.id, organizationId);
      toast.dismiss(loadingToast);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
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

  return (
    <div className="p-6 h-full flex flex-col w-full">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 xl:gap-6 shrink-0 mb-6">
        <div className="relative z-10 flex items-center gap-4 sm:gap-5 shrink-0">
          <div className="p-3.5 rounded-lg text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-transparent shrink-0">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight flex items-center gap-2 flex-wrap">
              <span className="text-slate-900">Billing &</span>
              <span className="text-indigo-600">Invoices</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">Manage patient bills, generate invoices, and record payments.</p>
          </div>
        </div>
        <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm shrink-0">
          <button 
            className={`px-5 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'create' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            onClick={() => setActiveTab('create')}
          >
            New Invoice
          </button>
          <button 
            className={`px-5 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'history' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
        </div>
      </div>

      {activeTab === 'create' && (
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 lg:flex-1 lg:min-h-0">
          
          {/* Left panel - Add Items */}
          <div className="lg:col-span-2 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm h-[600px] lg:h-auto lg:min-h-0 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-3">Select Patient</h2>
              
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    type="text"
                    className="w-full pl-9 pr-8 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white shadow-sm"
                    placeholder="Search by Name, Phone, ID, or Aadhaar..."
                    value={patientSearchTerm}
                    onChange={(e) => {
                      setPatientSearchTerm(e.target.value);
                      setIsPatientDropdownOpen(true);
                      if (!e.target.value) setSelectedPatientId('');
                    }}
                    onFocus={() => setIsPatientDropdownOpen(true)}
                  />
                  {patientSearchTerm && (
                    <button 
                      onClick={() => { setPatientSearchTerm(''); setSelectedPatientId(''); setIsPatientDropdownOpen(true); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {isPatientDropdownOpen && patientsList && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {patientsList.length === 0 ? (
                      <div className="p-3 text-center text-sm text-slate-500">No patients found</div>
                    ) : (
                      patientsList.map((p: any) => (
                        <button
                          key={p.id}
                          className="w-full text-left px-4 py-3 hover:bg-indigo-50/50 border-b border-slate-100 last:border-0 flex items-center justify-between group"
                          onClick={() => {
                            setSelectedPatientId(p.id);
                            setPatientSearchTerm(`${p.name} - ${p.phone}`);
                            setIsPatientDropdownOpen(false);
                          }}
                        >
                          <div>
                            <div className="font-bold text-sm text-slate-900 group-hover:text-indigo-700">{p.name}</div>
                            <div className="text-xs text-slate-500">{p.phone}</div>
                          </div>
                          <div className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">Select</div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

            </div>
            
            <div className="p-5 flex-1 overflow-y-auto bg-slate-50/30">
              <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-500" /> Add Services to Bill
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {services?.filter(s => s.isActive).map(service => (
                  <div key={service.id} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between group">
                    <div className="mb-3">
                      <span className="font-semibold text-slate-900 block truncate" title={service.name}>{service.name}</span>
                      <span className="text-xs text-slate-500">{service.category || 'General'}</span>
                    </div>
                    <span className="text-indigo-600 font-bold text-lg mb-3">₹{service.defaultPrice}</span>
                    <button 
                      onClick={() => addToCart(service, false)} 
                      className={`w-full mt-auto text-xs font-bold py-2 rounded-lg transition-colors bg-indigo-50 text-indigo-700 hover:bg-indigo-100`}
                    >
                      {cart.some(c => c.service.id === service.id) ? 'Add Again' : 'Add to Bill'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel - Invoice summary */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[600px] lg:h-auto lg:min-h-0 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
               <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Invoice Summary</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 bg-slate-50/30">
              {cart.length === 0 ? (
                <div className="text-center text-slate-400 mt-12 flex flex-col items-center">
                  <Receipt className="w-12 h-12 mb-3 text-slate-200" />
                  <p>Cart is empty</p>
                  <p className="text-xs mt-1">Select services from the left panel</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {cart.map((item, idx) => (
                    <li key={idx} className="p-3 bg-white border border-slate-100 rounded-lg shadow-sm flex justify-between items-center group">
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="font-bold text-sm text-slate-900 truncate" title={item.service.name}>{item.service.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-1 py-0.5">
                            {!item.isPrescribed && <button onClick={() => updateQuantity(idx, -1)} className="text-slate-400 hover:text-slate-700 p-0.5 w-5 h-5 flex items-center justify-center font-medium">-</button>}
                            <span className="text-xs font-bold text-slate-700 w-4 text-center">{item.quantity}</span>
                            {!item.isPrescribed && <button onClick={() => updateQuantity(idx, 1)} className="text-slate-400 hover:text-slate-700 p-0.5 w-5 h-5 flex items-center justify-center font-medium">+</button>}
                          </div>
                          <span className="text-xs text-slate-500">× ₹{item.service.defaultPrice}</span>
                          {item.isPrescribed && <span className="ml-2 text-[10px] uppercase font-bold tracking-wider text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">Prescribed</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="font-bold text-sm text-slate-900">₹{item.service.defaultPrice * item.quantity}</span>
                        {!item.isPrescribed && (
                          <button onClick={() => removeFromCart(idx)} className="text-slate-400 hover:text-rose-500 transition-colors p-1 hover:bg-rose-50 rounded-md">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="p-5 bg-white border-t border-slate-100 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium text-sm">Subtotal</span>
                <span className="font-bold text-slate-900">₹{subTotal}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium text-sm">Discount (₹)</span>
                <input type="number" min="0" value={discount} onChange={e => setDiscount(Number(e.target.value) || 0)} className="w-24 text-right px-2 py-1 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium text-sm">Tax (₹)</span>
                <input type="number" min="0" value={tax} onChange={e => setTax(Number(e.target.value) || 0)} className="w-24 text-right px-2 py-1 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" />
              </div>
              <div className="flex justify-between items-center text-lg font-black pt-4 border-t border-slate-200 mt-2">
                <span>Total Amount</span>
                <span className="text-indigo-600">₹{total}</span>
              </div>
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-200">
              <button 
                onClick={() => createInvoiceMut.mutate()}
                disabled={createInvoiceMut.isPending || cart.length === 0 || !selectedPatientId}
                className="w-full btn-primary py-3 text-base shadow-sm"
              >
                {createInvoiceMut.isPending ? <Activity className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                {createInvoiceMut.isPending ? 'Generating...' : 'Generate Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 overflow-hidden flex flex-col">
          {isLoadingInvoices ? <PageLoader /> : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice #</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Patient Name</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total (₹)</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Paid (₹)</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {invoices?.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600">{inv.invoiceNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium">{new Date(inv.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{inv.patientName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-slate-900">₹{inv.totalAmount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-emerald-600 font-bold">₹{inv.paidAmount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-full border ${inv.status === 2 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : inv.status === 1 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                          {inv.status === 2 ? 'Paid' : inv.status === 1 ? 'Partial' : 'Unpaid'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-3 items-center">
                          {inv.status !== 2 && (
                            <button onClick={() => {
                               const amt = prompt('Enter payment amount received (Cash):', String(inv.totalAmount - inv.paidAmount));
                               if (amt && !isNaN(Number(amt))) {
                                 payInvoiceMut.mutate({ invoiceId: inv.id, amount: Number(amt), mode: 1 });
                               }
                            }} className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 transition-colors">
                              <CreditCard className="w-4 h-4" /> Receive Pay
                            </button>
                          )}
                          <button onClick={() => handlePrint(inv)} className="text-slate-400 hover:text-indigo-600 transition-colors bg-slate-50 hover:bg-indigo-50 p-2 rounded-lg border border-slate-200 shadow-sm">
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {invoices?.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-12 text-slate-500 font-medium">No invoices found for the last 30 days.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
