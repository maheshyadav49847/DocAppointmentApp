import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { billingService, type ServiceItem } from '@/services/billingService';
import { PageLoader } from '@/components/ui/PageLoader';
import { Plus, Edit2, Trash2, X, Save, Activity, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

export default function BillingServicesPage() {
  const { user, activeBranchId } = useAuthStore();
  const organizationId = user?.orgId || '';
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    defaultPrice: 0,
    isActive: true
  });

  const { data: services, isLoading } = useQuery({
    queryKey: ['billing-services', organizationId],
    queryFn: () => billingService.getServices(organizationId),
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => billingService.createService({ ...data, organizationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-services'] });
      setIsModalOpen(false);
      toast.success('Service added to rate list');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => billingService.updateService(editingService!.id, { ...data, id: editingService!.id, organizationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-services'] });
      setIsModalOpen(false);
      toast.success('Service updated');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => billingService.deleteService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-services'] });
      toast.success('Service deleted');
    }
  });

  const handleOpenModal = (service?: ServiceItem) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        category: service.category || '',
        defaultPrice: service.defaultPrice,
        isActive: service.isActive
      });
    } else {
      setEditingService(null);
      setFormData({ name: '', category: '', defaultPrice: 0, isActive: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingService) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="p-6 flex flex-col h-full w-full">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 xl:gap-6 shrink-0 mb-6">
        <div className="relative z-10 flex items-center gap-4 sm:gap-5 shrink-0">
          <div className="p-3.5 rounded-lg text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-transparent shrink-0">
            <LayoutGrid className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight flex items-center gap-2 flex-wrap">
              <span className="text-slate-900">Rate List /</span>
              <span className="text-indigo-600">Service Master</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">Manage the clinic's master list of procedures, tests, and their default prices.</p>
          </div>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary shadow-sm">
          <Plus className="w-4 h-4" /> Add Service
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 overflow-hidden flex flex-col">
        {isLoading ? <PageLoader /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Service Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Default Price</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {services?.map((service) => (
                  <tr key={service.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{service.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500">{service.category || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-900 font-semibold">₹{service.defaultPrice}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${service.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                        {service.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleOpenModal(service)} className="text-indigo-600 hover:text-indigo-900 mr-4 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => { if(window.confirm('Delete this service?')) deleteMutation.mutate(service.id); }} className="text-rose-600 hover:text-rose-900 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {services?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-500">
                      No services found. Click "Add Service" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-bold text-slate-900">
                  {editingService ? 'Edit Service' : 'Add New Service'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Service Name</label>
                  <Input 
                    required 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white shadow-sm"
                    placeholder="e.g. CBC Test, Root Canal"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category (Optional)</label>
                  <Input 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})} 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white shadow-sm"
                    placeholder="e.g. Pathology, Dental, Consultation"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Default Price (₹)</label>
                  <Input 
                    type="number" 
                    required 
                    min="0"
                    value={formData.defaultPrice} 
                    onChange={e => setFormData({...formData, defaultPrice: Number(e.target.value)})} 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white shadow-sm"
                  />
                </div>
                <div className="flex items-center pt-2">
                  <input 
                    type="checkbox" 
                    id="isActive"
                    checked={formData.isActive} 
                    onChange={e => setFormData({...formData, isActive: e.target.checked})} 
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-slate-900 cursor-pointer">
                    Active (Available for billing)
                  </label>
                </div>
                
                <div className="pt-6 flex justify-end gap-3 border-t border-slate-100 mt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary">
                    {(createMutation.isPending || updateMutation.isPending) ? <Activity className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {editingService ? 'Save Changes' : 'Add Service'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
