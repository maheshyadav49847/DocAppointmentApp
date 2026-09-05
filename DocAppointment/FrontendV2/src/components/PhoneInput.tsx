import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Phone } from 'lucide-react';

interface PhoneInputProps {
  phone?: string;
  dialCode?: string;
  onChange?: (phone: string, dialCode: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
  dialCodeName?: string;
  defaultValue?: string;
  defaultDialCode?: string;
  required?: boolean;
}

export default function PhoneInput({
  phone: controlledPhone,
  dialCode: controlledDialCode,
  onChange,
  onFocus,
  onBlur,
  placeholder = "Phone number",
  className = "",
  disabled = false,
  name,
  dialCodeName,
  defaultValue = "",
  defaultDialCode = "+91"
}: PhoneInputProps) {
  const [internalPhone, setInternalPhone] = useState(defaultValue);
  const [internalDialCode, setInternalDialCode] = useState(defaultDialCode);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const typeaheadBuffer = useRef("");
  const typeaheadTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isControlled = controlledPhone !== undefined;
  
  const phone = isControlled ? controlledPhone : internalPhone;
  const dialCode = isControlled ? controlledDialCode : internalDialCode;

  const handleChange = (p: string, dc: string) => {
    if (!isControlled) {
      setInternalPhone(p);
      setInternalDialCode(dc);
    }
    if (onChange) onChange(p, dc);
  };
  
  const { data: countries } = useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      const response = await api.get('/countries');
      return response.data;
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  // Default to +91 if not provided and countries are loaded
  useEffect(() => {
    if (!dialCode && countries && countries.length > 0) {
      handleChange(phone || '', '+91');
    }
  }, [dialCode, countries, phone]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Focus the selected item if available
      const selectedIso = countries?.find((c: any) => c.dialCode === dialCode)?.isoCode || 'IN';
      const selectedEl = document.getElementById(`country-${selectedIso}`);
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
        selectedEl.focus();
      }
    } else {
      typeaheadBuffer.current = "";
    }
  }, [isOpen, dialCode, countries]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === "Escape") {
      setIsOpen(false);
      return;
    }

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const focusable = Array.from(dropdownRef.current?.querySelectorAll('button[id^="country-"]') || []) as HTMLElement[];
      const currentIndex = focusable.findIndex(el => el === document.activeElement);
      if (e.key === "ArrowDown") {
        const next = focusable[currentIndex + 1 < focusable.length ? currentIndex + 1 : 0];
        if (next) { next.focus(); next.scrollIntoView({ block: 'nearest' }); }
      } else {
        const prev = focusable[currentIndex - 1 >= 0 ? currentIndex - 1 : focusable.length - 1];
        if (prev) { prev.focus(); prev.scrollIntoView({ block: 'nearest' }); }
      }
      return;
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      const char = e.key.toLowerCase();
      typeaheadBuffer.current += char;
      
      if (typeaheadTimeout.current) clearTimeout(typeaheadTimeout.current);
      typeaheadTimeout.current = setTimeout(() => {
        typeaheadBuffer.current = "";
      }, 500);

      const match = countries?.find((c: any) => c.name.toLowerCase().startsWith(typeaheadBuffer.current));
      if (match) {
        const el = document.getElementById(`country-${match.isoCode}`);
        if (el) {
          el.scrollIntoView({ block: 'nearest' });
          el.focus();
        }
      }
    }
  };

  return (
    <div className={`flex items-center w-full bg-slate-50 border border-slate-200 rounded-xl focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}>
      {/* Icon */}
      <div className="pl-3.5 pr-2 text-slate-400 group-focus-within:text-indigo-500 transition-colors flex items-center justify-center shrink-0">
        <Phone className="w-4 h-4" />
      </div>
      
      {/* Custom Dial Code Dropdown */}
      <div className="relative flex items-center shrink-0" ref={dropdownRef} onKeyDown={handleKeyDown}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between pl-1 pr-2 h-10 min-w-[70px] text-sm text-slate-700 font-medium hover:bg-slate-100/50 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <span>{dialCode || '+91'}</span>
          <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-64 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            {countries ? (
              countries.map((c: any) => (
                <button
                  key={c.isoCode}
                  id={`country-${c.isoCode}`}
                  type="button"
                  onClick={() => {
                    handleChange(phone || '', c.dialCode);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 outline-none focus:bg-indigo-50 transition-colors flex items-center justify-between ${
                    dialCode === c.dialCode ? 'bg-indigo-50/50 text-indigo-600 font-semibold' : 'text-slate-700 font-medium'
                  }`}
                >
                  <span className="truncate pr-2">{c.name}</span>
                  <span className="text-slate-400 font-normal shrink-0">{c.dialCode}</span>
                </button>
              ))
            ) : (
              <button
                type="button"
                id="country-IN"
                onClick={() => {
                  handleChange(phone || '', '+91');
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 outline-none focus:bg-indigo-50 transition-colors flex items-center justify-between text-indigo-600 font-semibold bg-indigo-50/50"
              >
                <span>India</span>
                <span className="text-slate-400 font-normal shrink-0">+91</span>
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Divider */}
      <div className="w-px h-5 bg-slate-200 mx-1 shrink-0"></div>

      {name && <input autoComplete="off" type="hidden" name={name} value={phone || ''} />}
      {dialCodeName && <input autoComplete="off" type="hidden" name={dialCodeName} value={dialCode || '+91'} />}

      {/* Phone Number Input */}
      <input
        type="tel"
        value={phone || ''}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, '').slice(0, 15);
          handleChange(val, dialCode || '+91');
        }}
        onFocus={onFocus}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={placeholder}
        className="flex-1 min-w-0 px-2 py-2.5 text-sm bg-transparent border-none outline-none text-slate-900 font-medium placeholder:text-slate-400"
        autoComplete="off"
      />
    </div>
  );
}
