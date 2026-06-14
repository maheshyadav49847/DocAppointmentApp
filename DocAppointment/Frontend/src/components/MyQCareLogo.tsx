

export const MyQCareLogo = ({ size = 24, className = "" }: { size?: number, className?: string }) => {
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
      {/* Outer Q Circle */}
      <circle cx="11" cy="11" r="9" />
      
      {/* Q Tail */}
      <path d="M17.5 17.5 L22 22" />
      
      {/* Medical ECG Pulse inside the Q */}
      <path d="M4.5 11 H7.5 L9.5 6 L12.5 16 L14.5 11 H17.5" />
    </svg>
  );
};
