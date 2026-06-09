import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { medicineService, type MedicineDto } from '../../../services/medicineService';

interface MedicineAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  onSelectMedicine: (med: MedicineDto) => void;
  placeholder?: string;
}

export default function MedicineAutocomplete({ value, onChange, onSelectMedicine, placeholder = 'e.g. Paracetamol' }: MedicineAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: medicines } = useQuery({
    queryKey: ['medicines', value],
    queryFn: () => medicineService.getAll(value),
    enabled: isOpen && value.length >= 1,
    staleTime: 60000
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      // Simple focus management could be added here
    }
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
      />
      
      {isOpen && value.length >= 1 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {medicines?.items?.length === 0 ? (
            <div className="p-3 text-sm text-slate-500 flex items-center gap-2">
              <span className="text-slate-400">No match found. Type to add custom.</span>
            </div>
          ) : (
            <ul className="py-1">
              {medicines?.items?.map((med) => (
                <li
                  key={med.id}
                  onClick={() => {
                    onChange(med.name);
                    onSelectMedicine(med);
                    setIsOpen(false);
                  }}
                  className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center justify-between group transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-800">{med.name}</span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      {med.type && <span className="text-indigo-500 font-medium">{med.type}</span>}
                      {med.genericName && <span>• {med.genericName}</span>}
                    </span>
                  </div>
                  <Check className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
