import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageLoaderProps {
  message?: string;
  subMessage?: string;
  className?: string;
  minHeight?: string;
}

export function PageLoader({ 
  message = "Loading...", 
  subMessage, 
  className,
  minHeight = "min-h-[60vh]"
}: PageLoaderProps) {
  return (
    <div className={cn(`flex flex-col items-center justify-center gap-4 w-full ${minHeight}`, className)}>
      <div className="w-16 h-16 bg-indigo-50/50 rounded-full flex items-center justify-center mb-2">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-bold text-slate-700 animate-pulse">{message}</h3>
        {subMessage && (
          <p className="text-sm text-slate-500 mt-1">{subMessage}</p>
        )}
      </div>
    </div>
  );
}
