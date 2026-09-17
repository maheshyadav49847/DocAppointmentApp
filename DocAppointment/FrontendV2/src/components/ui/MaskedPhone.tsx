import { useState } from "react";
import { Eye, EyeOff, Phone } from "lucide-react";

export interface MaskedPhoneProps {
  phone?: string | null;
  dialCode?: string | null;
  showIcon?: boolean;
  emptyText?: string;
  className?: string;
  textClassName?: string;
  iconClassName?: string;
}

/**
 * Normalizes dial code and phone number:
 * - Ensures dial code is prefixed with '+'
 * - Falls back to +91 if missing
 * - Strips redundant dial code from phone if already present
 */
export function formatPhoneWithDialCode(
  rawPhone?: string | null,
  rawDialCode?: string | null
): { dialCode: string; number: string; fullFormatted: string; isValid: boolean } {
  if (!rawPhone || !rawPhone.trim()) {
    return { dialCode: "", number: "", fullFormatted: "", isValid: false };
  }

  let phone = rawPhone.trim();
  let dialCode = (rawDialCode || "").trim();

  // Normalize dialCode with '+'
  if (dialCode && !dialCode.startsWith("+")) {
    dialCode = `+${dialCode}`;
  }

  // If phone itself starts with '+', extract or align with dialCode
  if (phone.startsWith("+")) {
    if (dialCode && phone.startsWith(dialCode)) {
      phone = phone.slice(dialCode.length).trim();
    } else {
      const match = phone.match(/^(\+\d{1,4})\s*(.*)$/);
      if (match) {
        dialCode = match[1];
        phone = match[2];
      }
    }
  } else if (dialCode) {
    // If phone starts with dial code digits without '+'
    const dialDigits = dialCode.replace(/^\+/, "");
    if (phone.startsWith(dialDigits) && phone.length >= dialDigits.length + 7) {
      phone = phone.slice(dialDigits.length).trim();
    }
  }

  if (!dialCode) {
    dialCode = "+91";
  }

  // Remove leading zeros often found in STD format (e.g., 09876543210 -> 9876543210)
  const cleanNumber = phone.replace(/^0+/, "");

  return {
    dialCode,
    number: cleanNumber,
    fullFormatted: `${dialCode} ${cleanNumber}`,
    isValid: true,
  };
}

/**
 * Returns masked representation of phone digits.
 * Keeps last 4 digits visible and masks preceding digits with bullets.
 */
export function maskPhoneNumber(phoneDigits: string): string {
  const digitsOnly = phoneDigits.replace(/\D/g, "");
  if (digitsOnly.length <= 4) {
    return phoneDigits;
  }
  const visible = digitsOnly.slice(-4);
  const maskedCount = digitsOnly.length - 4;
  const dots = "••••••".slice(0, Math.min(maskedCount, 6));
  return `${dots}${visible}`;
}

export function MaskedPhone({
  phone,
  dialCode,
  showIcon = false,
  emptyText = "N/A",
  className = "",
  textClassName = "",
  iconClassName = "w-3.5 h-3.5 text-slate-400",
}: MaskedPhoneProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  const { dialCode: normalizedDialCode, number, fullFormatted, isValid } =
    formatPhoneWithDialCode(phone, dialCode);

  if (!isValid) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-slate-400 font-medium ${className}`}>
        {showIcon && <Phone className={iconClassName} />}
        <span>{emptyText}</span>
      </span>
    );
  }

  const maskedDisplay = maskPhoneNumber(number);

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap ${className}`}
      title={isRevealed ? fullFormatted : `${normalizedDialCode} ${maskedDisplay} (Click eye to reveal)`}
    >
      {showIcon && <Phone className={iconClassName} />}
      <span className={`font-semibold tracking-tight ${textClassName || "text-slate-800"}`}>
        <span className="text-slate-500 font-medium mr-1">{normalizedDialCode}</span>
        {isRevealed ? (
          <span>{number}</span>
        ) : (
          <span className="tracking-wide">{maskedDisplay}</span>
        )}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setIsRevealed(!isRevealed);
        }}
        className="p-0.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors focus:outline-none shrink-0"
        title={isRevealed ? "Hide number" : "Show full number"}
        aria-label={isRevealed ? "Hide phone number" : "Show phone number"}
      >
        {isRevealed ? (
          <EyeOff className="w-3.5 h-3.5 text-indigo-600" />
        ) : (
          <Eye className="w-3.5 h-3.5" />
        )}
      </button>
    </span>
  );
}

export default MaskedPhone;
