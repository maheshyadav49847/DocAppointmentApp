import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { PaymentCheckoutUI, type PaymentEntry } from './PaymentCheckoutUI';
import { X, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

export default function RecordPaymentModal({ invoiceId, patientName, onClose, onPrint }: any) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [ isProcessing, setIsProcessing ] = useState(false);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => {
      const res = await api.get(`/billing/invoices/${invoiceId}?organizationId=${user?.orgId}`);
      return res.data;
    }
  });

  const handleCompletePayment = async (payments: PaymentEntry[]) => {
    setIsProcessing(true);
    try {
      for (const p of payments) {
        await api.post('/billing/invoices/pay', {
          invoiceId: invoiceId,
          organizationId: user?.orgId,
          amount: p.amount,
          paymentMode: p.mode,
          transactionId: p.transactionId
        });
      }
      toast.success("Payment recorded!");
      queryClient.invalidateQueries({ queryKey: ['upcomingTokens'] });
      queryClient.invalidateQueries({ queryKey: ['queueDetails'] });
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setIsProcessing(false);
    }
  };
	  if (isLoading) return <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!invoice) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" /> 
            Receive Payment
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-0 overflow-y-auto">
          <PaymentCheckoutUI
            totalAmount={invoice.totalAmount}
            paidAmount={invoice.paidAmount}
            patientName={patientName}
            isProcessing={isProcessing}
            onComplete={handleCompletePayment}
            onPrint={() => {
               onPrint(invoiceId);
            }}
          />
        </div>
      </div>
    </div>
  );
}