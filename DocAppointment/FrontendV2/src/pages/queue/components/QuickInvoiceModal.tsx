import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Receipt, Trash2, Plus, CreditCard, CheckCircle, Printer } from "lucide-react";
import { handlePrintInvoice } from "@/utils/printHelper";
import { branchService } from "@/services/branchService";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { billingService, type ServiceItem } from "@/services/billingService";
import { PaymentCheckoutUI, type PaymentEntry } from './PaymentCheckoutUI';
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function QuickInvoiceModal({ isOpen, onClose, billingToken }: any) {
  const { user, activeBranchId } = useAuthStore();
  const organizationId = user?.orgId || "";
  const branchId = activeBranchId || "";
  const queryClient = useQueryClient();

  const [cart, setCart] = useState<{ service: ServiceItem, quantity: number, isPrescribed: boolean }[]>([]);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);
  const [showPaymentUI, setShowPaymentUI] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const handleCompletePayment = async (payments: PaymentEntry[]) => {
    if (!createdInvoiceId) return;
    setIsProcessingPayment(true);
    try {
      for (const p of payments) {
        await api.post('/billing/invoices/pay', {
          invoiceId: createdInvoiceId,
          organizationId: user?.orgId,
          amount: p.amount,
          paymentMode: p.mode,
          transactionId: p.transactionId
        });
      }
      toast.success("Payment recorded!");
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const { data: myBranches = [] } = useQuery({
    queryKey: ['my-branches'],
    queryFn: () => branchService.getMyBranches(),
  });
  const activeBranch = myBranches.find(b => b.id === branchId);

  // Reset when token changes
  useEffect(() => {
    if (isOpen) {
      setCart([]);
      setDiscount(0);
      setTax(0);
      setCreatedInvoiceId(null);
    }
  }, [isOpen, billingToken]);

  const { data: services } = useQuery({
    queryKey: ['billing-services', organizationId],
    queryFn: () => billingService.getServices(organizationId),
    enabled: isOpen && !!organizationId
  });

  // Fetch latest visit for this patient to auto-populate prescribed items
  useEffect(() => {
    if (!isOpen || !billingToken || !services || services.length === 0) return;

    const fetchLatestVisit = async () => {
      try {
        const res = await api.get(`/patientclinical/${billingToken.patientId}/visits?page=1&limit=1`);
        if (res.data && res.data.data && res.data.data.length > 0) {
          const latestVisit = res.data.data[0];
          
          const visitDate = new Date(latestVisit.visitDate);
          const today = new Date();
          if (visitDate.toDateString() === today.toDateString()) {
             if (latestVisit.services && latestVisit.services.length > 0) {
               const invoiceRes = await api.get(`/billing/invoices?organizationId=${organizationId}&branchId=${branchId}`);
               const invoicesForToday = invoiceRes.data?.items?.filter((i: any) => i.patientId === billingToken.patientId && new Date(i.createdAt).toDateString() === today.toDateString()) || [];
               
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
  }, [isOpen, billingToken, services, organizationId, branchId]);

  const createInvoiceMut = useMutation({
    mutationFn: async () => {
      if (!billingToken) throw new Error("Select a patient");
      if (cart.length === 0) throw new Error("Add at least one item to bill");
      
      const payload = {
        organizationId,
        branchId,
        patientId: billingToken.patientId,
        tokenId: billingToken.id,
        doctorId: billingToken.queue?.doctorId, // Might be null, handle backend
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
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setCreatedInvoiceId(invoiceId);
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
      onClose();
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

  const subTotal = cart.reduce((acc, item) => acc + (item.service.defaultPrice * item.quantity), 0);
  const total = subTotal - discount + tax;

  if (!isOpen || !billingToken) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
          onClick={onClose} 
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white z-10">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-600" />
                Quick Invoice
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Patient: <span className="font-bold text-slate-700">{billingToken.patientName}</span>
              </p>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {createdInvoiceId ? (
            showPaymentUI ? (
              <div className="flex-1 overflow-y-auto">
                <PaymentCheckoutUI
                  totalAmount={total}
                  paidAmount={0}
                  patientName={billingToken.patientName}
                  isProcessing={isProcessingPayment}
                  onComplete={handleCompletePayment}
                  onPrint={() => {
                    handlePrintInvoice(createdInvoiceId, organizationId, activeBranch);
                  }}
                />
              </div>
            ) : (
            <div className="flex-1 p-10 flex flex-col items-center justify-center text-center bg-slate-50/50">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">Invoice Generated!</h3>
              <p className="text-slate-500 mb-8 max-w-md">The invoice for {billingToken.patientName} has been created successfully. Total amount is ₹{total}.</p>
              
              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                <button 
                  onClick={() => setShowPaymentUI(true)}
                  className="flex-1 btn-primary py-3 rounded-xl flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-5 h-5" />
                  Record Payment
                </button>
                <button 
                  onClick={() => handlePrintInvoice(createdInvoiceId, organizationId, activeBranch)}
                  className="flex-1 bg-white border-2 border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 text-indigo-600 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Printer className="w-5 h-5" />
                  Print Bill
                </button>
              </div>
            </div>
            )
          ) : (
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* Left side - Services List */}
            <div className="flex-1 border-r border-slate-100 bg-slate-50/50 flex flex-col h-full overflow-hidden">
               <div className="p-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-700 text-sm">Available Services</h3>
               </div>
               <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                 {services?.filter(s => s.isActive).map(service => (
                    <div key={service.id} className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm hover:border-indigo-300 transition-all flex flex-col justify-between">
                      <div className="mb-2">
                        <span className="font-semibold text-sm text-slate-900 block truncate" title={service.name}>{service.name}</span>
                        <span className="text-xs text-slate-500">{service.category || 'General'}</span>
                      </div>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-indigo-600 font-bold text-sm">₹{service.defaultPrice}</span>
                        <button 
                          onClick={() => addToCart(service, false)} 
                          className="px-2 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-bold rounded-md transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ))}
               </div>
            </div>

            {/* Right side - Cart */}
            <div className="w-full md:w-96 bg-white flex flex-col h-full overflow-hidden shrink-0">
               <div className="p-4 border-b border-slate-100 bg-slate-50/30">
                  <h3 className="font-bold text-slate-700 text-sm">Invoice Summary</h3>
               </div>
               <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30">
                  {cart.length === 0 ? (
                    <div className="text-center text-slate-400 mt-10">
                      <Receipt className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                      <p className="text-sm">Cart is empty</p>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {cart.map((item, idx) => (
                        <li key={idx} className="p-3 bg-white border border-slate-100 rounded-lg shadow-sm flex justify-between items-center group">
                          <div className="flex-1 min-w-0 pr-3">
                            <div className="font-bold text-sm text-slate-900 truncate">{item.service.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-1 py-0.5">
                                {!item.isPrescribed && <button onClick={() => updateQuantity(idx, -1)} className="text-slate-400 hover:text-slate-700 p-0.5 w-4 h-4 flex items-center justify-center font-medium leading-none">-</button>}
                                <span className="text-xs font-bold text-slate-700 w-4 text-center">{item.quantity}</span>
                                {!item.isPrescribed && <button onClick={() => updateQuantity(idx, 1)} className="text-slate-400 hover:text-slate-700 p-0.5 w-4 h-4 flex items-center justify-center font-medium leading-none">+</button>}
                              </div>
                              <span className="text-xs text-slate-500">× ₹{item.service.defaultPrice}</span>
                              {item.isPrescribed && <span className="ml-1 text-[9px] uppercase font-bold text-indigo-500 bg-indigo-50 px-1 py-0.5 rounded border border-indigo-100">Prescribed</span>}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
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

               {/* Totals & Action */}
               <div className="p-4 bg-white border-t border-slate-100">
                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal</span>
                      <span>₹{subTotal}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500">
                      <span>Discount (₹)</span>
                      <input 
                        type="number" 
                        value={discount || ''} 
                        onChange={e => setDiscount(Number(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-right border border-slate-200 rounded-md text-sm bg-slate-50 focus:bg-white focus:outline-indigo-500"
                        placeholder="0"
                      />
                    </div>
                    <div className="flex justify-between items-center text-slate-500">
                      <span>Tax (₹)</span>
                      <input 
                        type="number" 
                        value={tax || ''} 
                        onChange={e => setTax(Number(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-right border border-slate-200 rounded-md text-sm bg-slate-50 focus:bg-white focus:outline-indigo-500"
                        placeholder="0"
                      />
                    </div>
                    <div className="flex justify-between items-center font-bold text-lg text-slate-800 pt-2 border-t border-slate-100 mt-2">
                      <span>Total Amount</span>
                      <span className="text-indigo-700">₹{total}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => createInvoiceMut.mutate()}
                    disabled={cart.length === 0 || createInvoiceMut.isPending}
                    className="w-full btn-primary py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {createInvoiceMut.isPending ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Create Invoice
                      </>
                    )}
                  </button>
               </div>
            </div>
          </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
