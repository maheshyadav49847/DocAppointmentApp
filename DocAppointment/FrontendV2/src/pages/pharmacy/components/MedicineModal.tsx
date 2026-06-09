import React, { useState, useEffect } from 'react';
import { Pill, Edit, X, Save, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MedicineDto, CreateMedicineCommand } from '../../../services/medicineService';

interface MedicineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  medicine?: MedicineDto | null;
}

export default function MedicineModal({ isOpen, onClose, onSave, medicine }: MedicineModalProps) {
  const [formData, setFormData] = useState<CreateMedicineCommand>({
    name: '',
    genericName: '',
    type: '',
    manufacturer: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (medicine) {
      setFormData({
        name: medicine.name,
        genericName: medicine.genericName || '',
        type: medicine.type || '',
        manufacturer: medicine.manufacturer || ''
      });
    } else {
      setFormData({
        name: '',
        genericName: '',
        type: '',
        manufacturer: ''
      });
    }
  }, [medicine, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    try {
      setLoading(true);
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-zinc-200"
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-white shadow-sm">
                  {medicine ? <Edit className="w-6 h-6" /> : <Pill className="w-6 h-6" />}
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                    <span className="text-slate-900">{medicine ? 'Edit' : 'Add'}</span>
                    <span className="text-indigo-600">{medicine ? '' : 'New '}Medicine</span>
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">{medicine ? 'Update medicine details.' : 'Add a new medicine.'}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <form id="medicine-form" onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                    Brand Name *
                  </label>
                  <input
                    autoFocus
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. Dolo 650"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                    Generic Name
                  </label>
                  <input
                    value={formData.genericName}
                    onChange={e => setFormData({ ...formData, genericName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. Paracetamol"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                    Type
                  </label>
                  <input
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Tablet, Syrup, etc."
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                    Manufacturer
                  </label>
                  <input
                    value={formData.manufacturer}
                    onChange={e => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. Micro Labs"
                  />
                </div>
              </form>
            </div>

            <div className="p-6 border-t bg-white flex justify-end gap-3">
              <button type="button" onClick={onClose} className="btn-danger"><X className="w-4 h-4" /> Cancel</button>
              <button type="submit" form="medicine-form" disabled={loading || !formData.name} className="btn-primary">
                {loading ? <Activity className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {medicine ? 'Save Changes' : 'Save Medicine'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
