import React, { useState, useEffect } from 'react';
import { CreditCard, Banknote, CheckCircle, Plus, Trash2, Smartphone, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface PaymentEntry {
  mode: number;
  amount: number;
  transactionId?: string;
}

interface PaymentCheckoutUIProps {
  totalAmount: number;
  paidAmount: number;
  patientName: string;
  isProcessing: boolean;
  onComplete: (payments: PaymentEntry[]) => void;
  onPrint: () => void;
}

export const PaymentModes = {
  Cash: 0,
  UPI: 1,
  Card: 2,
  Online: 3
};

const PAYMENT_OPTIONS = [
  { value: PaymentModes.Cash, label: 'Cash', icon: Banknote },
  { value: PaymentModes.UPI, label: 'UPI / QR', icon: Smartphone },
  { value: PaymentModes.Card, label: 'Card', icon: CreditCard },
  { value: 'split', label: 'Split Payment', icon: Plus },
];

export const PaymentCheckoutUI: React.FC<PaymentCheckoutUIProps> = ({
  totalAmount,
  paidAmount,
  patientName,
  isProcessing,
  onComplete,
  onPrint
}) => {
  const balanceDue = totalAmount - paidAmount;
  
  const [selectedMode, setSelectedMode] = useState<number | 'split'>(PaymentModes.Cash);
  const [singleAmount, setSingleAmount] = useState<number>(balanceDue);
  const [singleTxnId, setSingleTxnId] = useState<string>('');
  
  const [splitEntries, setSplitEntries] = useState<PaymentEntry[]>([
    { mode: PaymentModes.Cash, amount: balanceDue }
  ]);

  useEffect(() => {
    if (selectedMode !== 'split') {
      setSingleAmount(balanceDue);
    }
  }, [balanceDue, selectedMode]);

  const handleSplitAmountChange = (index: number, amount: number) => {
    const newEntries = [...splitEntries];
    newEntries[index].amount = amount;
    setSplitEntries(newEntries);
  };

  const handleSplitModeChange = (index: number, mode: number) => {
    const newEntries = [...splitEntries];
    newEntries[index].mode = mode;
    setSplitEntries(newEntries);
  };
  
  const handleSplitTxnChange = (index: number, txnId: string) => {
    const newEntries = [...splitEntries];
    newEntries[index].transactionId = txnId;
    setSplitEntries(newEntries);
  };

  const addSplitEntry = () => {
    setSplitEntries([...splitEntries, { mode: PaymentModes.UPI, amount: 0 }]);
  };

  const removeSplitEntry = (index: number) => {
    setSplitEntries(splitEntries.filter((_, i) => i !== index));
  };

  const totalSplitAmount = splitEntries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
  const isSplitValid = totalSplitAmount === balanceDue && splitEntries.every(e => e.amount > 0);
  const isSingleValid = singleAmount > 0 && singleAmount <= balanceDue;

  const handleSubmit = () => {
    if (selectedMode === 'split') {
      if (!isSplitValid) return;
      onComplete(splitEntries);
    } else {
      if (!isSingleValid) return;
      onComplete([{ 
        mode: selectedMode, 
        amount: singleAmount, 
        transactionId: singleTxnId.trim() || undefined 
      }]);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[450px] w-full bg-white">
      {/* Left Column: Summary */}
      <div className="md:w-1/3 bg-slate-50 border-r border-slate-100 p-8 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h3 className="text-2xl font-black text-slate-800 mb-2">Bill Generated!</h3>
        <p className="text-slate-500 mb-8 max-w-xs text-sm">
          Invoice for <span className="font-semibold text-slate-700">{patientName}</span> is ready for payment.
        </p>

        <div className="w-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-500 text-sm">Total Billed:</span>
            <span className="font-semibold text-slate-700">₹{totalAmount}</span>
          </div>
          {paidAmount > 0 && (
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-500 text-sm">Already Paid:</span>
              <span className="font-semibold text-emerald-600">₹{paidAmount}</span>
            </div>
          )}
          <div className="border-t border-dashed border-slate-200 my-2 pt-2 flex justify-between items-center">
            <span className="text-slate-700 font-bold">Balance Due:</span>
            <span className="font-black text-xl text-rose-600">₹{balanceDue}</span>
          </div>
        </div>

        <button 
          onClick={onPrint}
          className="w-full bg-white border-2 border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 text-indigo-600 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          Print Bill Only
        </button>
      </div>

      {/* Right Column: Payment Methods */}
      <div className="md:w-2/3 p-8 flex flex-col h-full bg-white">
        <h4 className="text-lg font-bold text-slate-800 mb-4">Select Payment Method</h4>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {PAYMENT_OPTIONS.map((opt) => {
            const isSelected = selectedMode === opt.value;
            const Icon = opt.icon;
            return (
              <button
                key={opt.label}
                onClick={() => setSelectedMode(opt.value)}
                className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                  isSelected 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' 
                    : 'border-slate-100 bg-white text-slate-500 hover:border-indigo-200 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-6 h-6 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className="text-xs font-bold text-center leading-tight">{opt.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto pr-2 pb-4">
          <AnimatePresence mode="wait">
            {selectedMode === 'split' ? (
              <motion.div
                key="split"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center mb-2">
                  <h5 className="font-semibold text-slate-700 text-sm">Split Breakdown</h5>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${totalSplitAmount === balanceDue ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    Total: ₹{totalSplitAmount} / ₹{balanceDue}
                  </span>
                </div>

                {splitEntries.map((entry, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row gap-3 p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                    <div className="flex-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Mode</label>
                      <select 
                        value={entry.mode}
                        onChange={(e) => handleSplitModeChange(idx, Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-indigo-500"
                      >
                        <option value={PaymentModes.Cash}>Cash</option>
                        <option value={PaymentModes.UPI}>UPI / QR</option>
                        <option value={PaymentModes.Card}>Card</option>
                        <option value={PaymentModes.Online}>Online</option>
                      </select>
                    </div>
                    <div className="w-full sm:w-1/3">
                      <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Amount (₹)</label>
                      <input 
                        type="number"
                        value={entry.amount || ''}
                        onChange={(e) => handleSplitAmountChange(idx, Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-indigo-500 font-semibold"
                        placeholder="0"
                      />
                    </div>
                    {entry.mode !== PaymentModes.Cash && (
                      <div className="flex-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Txn ID (Opt)</label>
                        <input 
                          type="text"
                          value={entry.transactionId || ''}
                          onChange={(e) => handleSplitTxnChange(idx, e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-indigo-500"
                          placeholder="Ref #"
                        />
                      </div>
                    )}
                    {splitEntries.length > 1 && (
                      <div className="flex items-end pb-1">
                        <button 
                          onClick={() => removeSplitEntry(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                <button 
                  onClick={addSplitEntry}
                  className="flex items-center gap-2 text-indigo-600 text-sm font-bold hover:bg-indigo-50 px-3 py-2 rounded-md transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Payment Source
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="single"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4 max-w-sm"
              >
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1.5 block">Amount Received (₹)</label>
                  <input 
                    type="number"
                    value={singleAmount || ''}
                    onChange={(e) => setSingleAmount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-bold text-slate-800 focus:bg-white focus:outline-indigo-500 focus:border-indigo-500 transition-all"
                  />
                  {singleAmount > balanceDue && (
                    <p className="text-amber-600 text-xs mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Cannot pay more than balance due
                    </p>
                  )}
                </div>

                {selectedMode !== PaymentModes.Cash && (
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1.5 block">Transaction ID / Ref # (Optional)</label>
                    <input 
                      type="text"
                      value={singleTxnId}
                      onChange={(e) => setSingleTxnId(e.target.value)}
                      placeholder="Enter reference number"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-indigo-500 focus:border-indigo-500 transition-all"
                    />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="pt-4 border-t border-slate-100 mt-auto">
          <button 
            onClick={handleSubmit}
            disabled={isProcessing || (selectedMode === 'split' ? !isSplitValid : !isSingleValid)}
            className="w-full btn-primary py-3.5 rounded-xl flex items-center justify-center gap-2 font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all"
          >
            {isProcessing ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Complete Payment & Print
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
