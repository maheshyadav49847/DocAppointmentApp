import React, { useEffect } from 'react';
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
  const [internalPhone, setInternalPhone] = React.useState(defaultValue);
  const [internalDialCode, setInternalDialCode] = React.useState(defaultDialCode);

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

  return (
    <div className={`flex items-center w-full bg-slate-50 border border-slate-200 rounded-xl focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all ${disabled ? 'opacity-50 bg-slate-100' : ''} ${className}`}>
      {/* Icon */}
      <div className="pl-3.5 pr-2 text-slate-400 group-focus-within:text-indigo-500 transition-colors flex items-center justify-center shrink-0">
        <Phone className="w-4 h-4" />
      </div>
      
      {/* Dial Code Dropdown Container */}
      <div className="relative flex items-center shrink-0">
        <select
          value={dialCode || '+91'}
          onChange={(e) => handleChange(phone || '', e.target.value)}
          disabled={disabled}
          className="h-10 bg-transparent text-sm text-slate-700 font-medium border-none focus:ring-0 cursor-pointer appearance-none outline-none pl-1 pr-6"
        >
          {countries?.map((c: any) => (
            <option key={c.isoCode} value={c.dialCode}>
              {c.isoCode} {c.dialCode}
            </option>
          ))}
          {!countries && <option value="+91">IN +91</option>}
        </select>

        {/* Down chevron */}
        <div className="absolute right-2 pointer-events-none flex items-center justify-center">
          <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      
      {/* Divider */}
      <div className="w-px h-5 bg-slate-200 mx-1 shrink-0"></div>

      {name && <input autoComplete="off" type="hidden" name={name} value={phone} />}
      {dialCodeName && <input autoComplete="off" type="hidden" name={dialCodeName} value={dialCode || '+91'} />}

      {/* Phone Number Input */}
      <input
        type="tel"
        value={phone}
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
