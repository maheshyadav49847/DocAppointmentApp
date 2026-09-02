import React, { useState, useEffect } from 'react';
import { Pill, Edit, X, Save, Activity, Plus, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MedicineDto, CreateMedicineCommand } from '../../../services/medicineService';
import { medicineService } from '../../../services/medicineService';

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
    medicineTypeId: '',
    manufacturer: ''
  });
  const [loading, setLoading] = useState(false);
  const [medicineTypes, setMedicineTypes] = useState<any[]>([]);
  const [isAddingType, setIsAddingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [addingTypeLoading, setAddingTypeLoading] = useState(false);

  const handleAddType = async () => {
    if (!newTypeName.trim()) {
      setIsAddingType(false);
      return;
    }
    try {
      setAddingTypeLoading(true);
      const newType = await medicineService.createType(newTypeName.trim());
      setMedicineTypes([...medicineTypes, newType]);
      setFormData({ ...formData, medicineTypeId: newType.id });
      setNewTypeName('');
      setIsAddingType(false);
    } catch (err) {
      console.error('Failed to add new type', err);
    } finally {
      setAddingTypeLoading(false);
    }
  };

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const types = await medicineService.getTypes();
        setMedicineTypes(types);
      } catch (err) {
        console.error('Failed to fetch medicine types', err);
      }
    };
    fetchTypes();
  }, []);

  useEffect(() => {
    if (medicine) {
      setFormData({
        name: medicine.name,
        genericName: medicine.genericName || '',
        medicineTypeId: medicine.medicineTypeId || '',
        manufacturer: medicine.manufacturer || ''
      });
    } else {
      setFormData({
        name: '',
        genericName: '',
        medicineTypeId: '',
        manufacturer: ''
      });
    }
  }, [medicine, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    try {
      setLoading(true);
      const payload = { ...formData };
      if (payload.medicineTypeId === '') {
        delete payload.medicineTypeId;
      }
      await onSave(payload);
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
              <form noValidate autoComplete="off" id="medicine-form" onSubmit={handleSubmit} className="space-y-5">
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                      Type
                    </label>
                    {!isAddingType && (
                      <button 
                        type="button" 
                        onClick={() => setIsAddingType(true)}
                        className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium"
                      >
                        <Plus className="w-3 h-3" /> Add New
                      </button>
                    )}
                  </div>
                  {isAddingType ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={newTypeName}
                        onChange={e => setNewTypeName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddType(); } }}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="New type name..."
                        disabled={addingTypeLoading}
                      />
                      <button 
                        type="button"
                        onClick={handleAddType}
                        disabled={addingTypeLoading || !newTypeName.trim()}
                        className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
                      >
                        {addingTypeLoading ? <Activity className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      </button>
                      <button 
                        type="button"
                        onClick={() => { setIsAddingType(false); setNewTypeName(''); }}
                        className="p-2 bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <select
                      value={formData.medicineTypeId || ''}
                      onChange={e => setFormData({ ...formData, medicineTypeId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    >
                      <option value="">Select Type</option>
                      {medicineTypes.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  )}
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
