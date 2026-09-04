import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { billingService, type ServiceItem } from '@/services/billingService';
import { PageLoader } from '@/components/ui/PageLoader';
import { Plus, Edit2, Trash2, X, Save, Activity, LayoutGrid, Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

export default function BillingServicesPage() {
  const { user } = useAuthStore();
  const organizationId = user?.orgId || '';
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    defaultPrice: 0,
    isActive: true
  });

  const { data: servicesData, isLoading } = useQuery({
    queryKey: ['billing-services', organizationId, page, pageSize, search],
    queryFn: () => billingService.getServices(organizationId, page, pageSize, search),
    enabled: !!organizationId,
  });

  const services = servicesData?.items || [];
  const totalPages = servicesData?.totalPages || 1;
  const totalCount = servicesData?.totalCount || 0;

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

  const handleExport = async () => {
    const loadingToast = toast.loading('Generating export...');
    try {
      const blob = await billingService.exportServices(organizationId, search);
      toast.dismiss(loadingToast);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RateList_Export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to export rate list');
    }
  };

  return (
    <div className="animate-in fade-in duration-500 flex-1 flex flex-col h-full min-h-0 space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 xl:gap-6 shrink-0">
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
      </div>

      {/* Main Card */}
      <div className="saas-card overflow-hidden flex flex-col flex-1 min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Toolbar */}
        <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              Services
              <span className="text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 ml-2">
                {totalCount} Total
              </span>
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select 
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
            >
              <option value={10}>10 rows</option>
              <option value={20}>20 rows</option>
              <option value={50}>50 rows</option>
            </select>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Search services..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 pr-4 py-2 w-full sm:w-64 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>
            <button onClick={handleExport} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button onClick={() => handleOpenModal()} className="btn-primary shadow-sm shrink-0 px-4">
              <Plus className="w-4 h-4" /> Add Service
            </button>
          </div>
        </div>

        {/* Table Area */}
        <div className="overflow-auto flex-1 bg-white p-4 sm:p-6">
          <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm w-full min-w-max overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Service Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Category</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Default Price</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      <div className="flex justify-center mb-2"><PageLoader /></div>
                      Loading rate list...
                    </td>
                  </tr>
                ) : services?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-500">
                      No services found.
                    </td>
                  </tr>
                ) : (
                  services?.map((service: any) => (
                    <tr key={service.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">{service.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-medium">{service.category || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-900 font-bold">₹{service.defaultPrice}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 inline-flex text-[10px] uppercase font-bold tracking-wider rounded-md border ${service.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                          {service.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleOpenModal(service)} className="text-slate-400 hover:text-indigo-600 mr-3 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => { if(window.confirm('Delete this service?')) deleteMutation.mutate(service.id); }} className="text-slate-400 hover:text-rose-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-200 bg-slate-50 mt-auto gap-4">
          <div className="text-sm font-medium text-slate-500">
            Showing <span className="font-bold text-slate-900">{(page - 1) * pageSize + 1}</span> to{' '}
            <span className="font-bold text-slate-900">{Math.min(page * pageSize, totalCount)}</span> of{' '}
            <span className="font-bold text-slate-900">{totalCount}</span> results
          </div>
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg shadow-sm p-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold transition-colors ${
                  page === p 
                    ? 'bg-indigo-50 text-indigo-600' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
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
                  <label htmlFor="isActive" className="ml-2 block text-sm font-bold text-slate-700 cursor-pointer">
                    Active <span className="font-normal text-slate-500">(Available for billing)</span>
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
