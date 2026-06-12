import React, { useState, useMemo, useRef, useEffect } from "react";
import { Pill, Plus, Search, Edit, Trash2, Activity, UploadCloud, DownloadCloud, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { medicineService, type MedicineDto } from "../../services/medicineService";
import MedicineModal from "./components/MedicineModal";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import type { ColumnDef, PaginationState, SortingState } from "@tanstack/react-table";

export default function PharmacyPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<MedicineDto | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  // Prevent accidental page refresh during import
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isImporting) {
        e.preventDefault();
        e.returnValue = ''; // Shows browser's default warning prompt
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isImporting]);

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination(prev => ({ ...prev, pageIndex: 0 })); // Reset page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: paginatedData, isLoading } = useQuery<any>({
    queryKey: ['medicines', debouncedSearch, pageIndex, pageSize, sorting],
    queryFn: () => medicineService.getAll(debouncedSearch, pageIndex + 1, pageSize, sorting[0]?.id, sorting[0]?.desc ? 'desc' : 'asc'),
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => medicineService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      setIsModalOpen(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => medicineService.update(selectedMedicine!.id, { ...data, id: selectedMedicine!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      setIsModalOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => medicineService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
    }
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => medicineService.importCsv(file, (progressEvent: any) => {
      if (progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(percentCompleted);
      }
    }),
    onSettled: () => {
      setIsImporting(false);
      setUploadProgress(null);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      alert(data?.message || "Medicines imported successfully!");
    },
    onError: (error: any) => {
      alert("Error importing medicines: " + (error?.response?.data || error.message));
    }
  });

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    importMutation.mutate(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadTemplate = () => {
    const headers = "BrandName,GenericName,Type,Manufacturer\n";
    const sampleRow = "Dolo 650,Paracetamol,Tablet,Micro Labs\n";
    const blob = new Blob([headers + sampleRow], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Medicine_Import_Template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSave = async (data: any) => {
    if (selectedMedicine) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this medicine?")) {
      deleteMutation.mutate(id);
    }
  };

  const openAddModal = () => {
    setSelectedMedicine(null);
    setIsModalOpen(true);
  };

  const openEditModal = (medicine: MedicineDto) => {
    setSelectedMedicine(medicine);
    setIsModalOpen(true);
  };

  const columns = useMemo<ColumnDef<MedicineDto>[]>(() => [
    {
      accessorKey: "name",
      header: "Brand Name",
      cell: ({ row }) => {
        const med = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-50 border border-slate-200 text-slate-500">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-900">{med.name}</div>
              {med.manufacturer && <div className="text-xs text-slate-500 mt-0.5">{med.manufacturer}</div>}
            </div>
          </div>
        );
      }
    },
    {
      accessorKey: "genericName",
      header: "Generic Name",
      cell: ({ row }) => <span className="text-slate-600">{row.original.genericName || '-'}</span>
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.original.type;
        return type ? (
          <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium">
            {type}
          </span>
        ) : <span className="text-slate-400">-</span>;
      }
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => {
        const med = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => openEditModal(med)}
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Edit"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(med.id)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      }
    }
  ], []);

  const table = useReactTable({
    data: paginatedData?.items || [],
    columns,
    pageCount: paginatedData?.totalPages || -1,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    state: {
      pagination: { pageIndex, pageSize },
      sorting
    },
    onPaginationChange: setPagination,
    onSortingChange: (updater) => {
      setSorting(updater);
      setPagination(prev => ({ ...prev, pageIndex: 0 }));
    },
  });

  return (
    <div className="animate-in fade-in duration-500 pb-12 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="relative z-10 flex items-center gap-4 sm:gap-5">
          <div className="p-3.5 rounded-2xl text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-transparent">
            <Pill className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="text-slate-900">Medicine Master</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">Manage global medicine database for prescriptions.</p>
          </div>
        </div>
      </div>

      <div className="saas-card overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
             <select
              value={pageSize}
              onChange={(e) => setPagination({ pageIndex: 0, pageSize: Number(e.target.value) })}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all"
              title="Rows per page"
            >
              {[10, 20, 50, 100].map(size => (
                <option key={size} value={size}>Show {size}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by brand or generic name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImport}
            />
            
            <button 
              className="px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2"
              onClick={downloadTemplate}
              title="Download exact CSV format required for import"
            >
              <DownloadCloud className="w-4 h-4" /> Template
            </button>

            <button 
              className="btn-secondary" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
            >
              {isImporting ? <Activity className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              {isImporting ? (uploadProgress !== null ? `Uploading ${uploadProgress}%` : 'Importing...') : 'Import CSV'}
            </button>

            <button onClick={openAddModal} className="btn-primary">
              <Plus className="w-4 h-4" /> Add Medicine
            </button>
          </div>
        </div>

        <div className="p-0 sm:p-6 bg-slate-50/50 flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48">
              <Activity className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : (paginatedData?.items?.length || 0) === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <Pill className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-700">No Medicines Found</h3>
              <p className="text-sm text-slate-500 mt-1">Try adjusting your search or add a new medicine.</p>
              <button onClick={openAddModal} className="text-indigo-500 font-medium mt-2 hover:underline">
                Add your first medicine
              </button>
            </div>
          ) : (
            <div className="bg-white sm:rounded-xl sm:border border-slate-200 shadow-sm relative">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 sticky top-0 sm:-top-6 z-20 shadow-sm outline outline-1 outline-slate-200">
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th key={header.id} className={`group/th px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-slate-50 ${header.id === 'actions' ? 'text-right' : ''}`}>
                          {header.isPlaceholder ? null : (
                            <div 
                              className={`flex items-center gap-2 ${header.column.getCanSort() ? 'cursor-pointer select-none' : ''} ${header.id === 'actions' ? 'justify-end' : ''}`}
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {header.column.getCanSort() && (
                                <span className="text-slate-400">
                                  {{
                                    asc: <ArrowUp className="w-3.5 h-3.5" />,
                                    desc: <ArrowDown className="w-3.5 h-3.5" />,
                                  }[header.column.getIsSorted() as string] ?? <ArrowUpDown className="w-3.5 h-3.5 opacity-0 group-hover/th:opacity-50" />}
                                </span>
                              )}
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {table.getRowModel().rows.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group">
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-sm text-slate-500 bg-slate-50">
          <div className="font-medium">
            Showing {(paginatedData?.items?.length || 0) > 0 ? pageIndex * pageSize + 1 : 0} to {Math.min((pageIndex + 1) * pageSize, paginatedData?.totalCount || 0)} of {paginatedData?.totalCount || 0} entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1 rounded-md hover:bg-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span className="sr-only">Previous</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="px-2 font-medium">Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}</span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1 rounded-md hover:bg-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span className="sr-only">Next</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

      </div>

      <MedicineModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        medicine={selectedMedicine}
      />
    </div>
  );
}
