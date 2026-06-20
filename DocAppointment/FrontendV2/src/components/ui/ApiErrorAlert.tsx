import { AlertCircle } from "lucide-react";

interface ApiErrorAlertProps {
  error: any;
  className?: string;
}

export function ApiErrorAlert({ error, className = "" }: ApiErrorAlertProps) {
  if (!error) return null;

  // ASP.NET Core validation errors parsing
  const validationErrors = error.response?.data?.errors || error.response?.data?.extensions?.errors;
  const generalMessage = error.response?.data?.message || error.response?.data?.detail;

  // Extract all error messages into a flat array
  const errorMessages: string[] = [];
  if (validationErrors) {
    Object.values(validationErrors).forEach((errMsgs: any) => {
      if (Array.isArray(errMsgs)) {
        errorMessages.push(...errMsgs);
      } else if (typeof errMsgs === 'string') {
        errorMessages.push(errMsgs);
      }
    });
  }

  // If no validation errors and no general message, don't show an empty alert (unless you want a fallback)
  if (errorMessages.length === 0 && !generalMessage) return null;

  return (
    <div className={`bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex gap-3 items-start ${className}`}>
      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="font-semibold text-sm">Please correct the following errors:</h4>
        {errorMessages.length > 0 ? (
          <ul className="list-disc list-inside mt-2 text-sm space-y-1">
            {errorMessages.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm mt-1">{generalMessage}</p>
        )}
      </div>
    </div>
  );
}
