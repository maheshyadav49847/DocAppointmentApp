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
    <div className={`relative flex items-center w-full group ${className}`}>
      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 z-10 group-focus-within:text-indigo-500 transition-colors" />
      
      {/* Dial Code Dropdown */}
      <select
        value={dialCode || '+91'}
        onChange={(e) => handleChange(phone || '', e.target.value)}
        disabled={disabled}
        className="absolute left-10 z-10 h-full bg-transparent text-sm text-slate-700 font-medium border-none focus:ring-0 cursor-pointer appearance-none outline-none"
        style={{ paddingRight: '20px' }}
      >
        {countries?.map((c: any) => (
          <option key={c.isoCode} value={c.dialCode}>
            {c.isoCode} {c.dialCode}
          </option>
        ))}
        {!countries && <option value="+91">IN +91</option>}
      </select>

      {/* Down chevron for custom select appearance */}
      <div className="absolute left-[85px] z-10 pointer-events-none">
        <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      
      {/* Divider */}
      <div className="absolute left-[105px] z-10 w-px h-5 bg-slate-200"></div>

      {name && <input type="hidden" name={name} value={phone} />}
      {dialCodeName && <input type="hidden" name={dialCodeName} value={dialCode || '+91'} />}

      {/* Phone Number Input */}
      <input
        type="tel"
        value={phone}
        onChange={(e) => {
          // Allow only digits and limit to 15 characters
          const val = e.target.value.replace(/\D/g, '').slice(0, 15);
          handleChange(val, dialCode || '+91');
        }}
        onFocus={onFocus}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full pl-[120px] pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400 disabled:opacity-50 disabled:bg-slate-100"
        autoComplete="off"
      />
    </div>
  );
}
