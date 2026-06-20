export function FieldError({ errors, field }: { errors?: Record<string, string[]>, field: string }) {
  if (!errors) return null;
  
  // Try exact match, or case-insensitive match since ASP.NET might PascalCase or camelCase them
  const key = Object.keys(errors).find(k => k.toLowerCase() === field.toLowerCase());
  
  if (!key || !errors[key] || errors[key].length === 0) return null;

  return (
    <p className="text-red-500 text-xs font-medium mt-1 animate-in fade-in slide-in-from-top-1">
      {errors[key][0]}
    </p>
  );
}
