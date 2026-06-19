

export const MyQCareLogo = ({ 
  size = 24, 
  className = "", 
  lensColor,
  pulseColor = "#818cf8" 
}: { 
  size?: number, 
  className?: string, 
  lensColor?: string,
  pulseColor?: string 
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      {/* Lens (Outer Q Circle and Tail) */}
      <g stroke={lensColor || "currentColor"}>
        <circle cx="11" cy="11" r="9" />
        <path d="M17.5 17.5 L22 22" />
      </g>
      
      {/* Medical ECG Pulse inside the Q - Left Half */}
      <path d="M4.5 11 H7.5 L9.5 6 L11 11" />
      
      {/* Medical ECG Pulse inside the Q - Right Half */}
      <path d="M11 11 L12.5 16 L14.5 11 H17.5" stroke={pulseColor} />
    </svg>
  );
};
