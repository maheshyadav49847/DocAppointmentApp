import { useState } from "react";
import { Eye, EyeOff, Mail } from "lucide-react";

export interface MaskedEmailProps {
  email?: string | null;
  showIcon?: boolean;
  emptyText?: string;
  className?: string;
  textClassName?: string;
  iconClassName?: string;
}

/**
 * Masks an email address:
 * e.g. "deepak.mishra@gmail.com" -> "de••••••a@gmail.com"
 * e.g. "dr@hospital.org" -> "d*@hospital.org"
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return email;

  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return email;

  if (localPart.length <= 2) {
    return `${localPart[0]}*@${domain}`;
  }

  if (localPart.length <= 4) {
    return `${localPart[0]}••${localPart.slice(-1)}@${domain}`;
  }

  // Keep first 2 and last 1 characters, mask middle with dots
  const start = localPart.slice(0, 2);
  const end = localPart.slice(-1);
  const dotCount = Math.min(Math.max(localPart.length - 3, 3), 6);
  const dots = "••••••".slice(0, dotCount);

  return `${start}${dots}${end}@${domain}`;
}

export function MaskedEmail({
  email,
  showIcon = false,
  emptyText = "--",
  className = "",
  textClassName = "",
  iconClassName = "w-3.5 h-3.5 text-slate-400",
}: MaskedEmailProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  const cleanEmail = (email || "").trim();

  if (!cleanEmail) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-slate-400 font-medium ${className}`}>
        {showIcon && <Mail className={iconClassName} />}
        <span>{emptyText}</span>
      </span>
    );
  }

  const maskedDisplay = maskEmail(cleanEmail);

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap ${className}`}
      title={isRevealed ? cleanEmail : `${maskedDisplay} (Click eye to reveal)`}
    >
      {showIcon && <Mail className={iconClassName} />}
      <span className={`font-semibold tracking-tight ${textClassName || "text-slate-800"}`}>
        {isRevealed ? (
          <span>{cleanEmail}</span>
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
        title={isRevealed ? "Hide email" : "Show full email"}
        aria-label={isRevealed ? "Hide email" : "Show full email"}
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

export default MaskedEmail;
