import React from 'react';

interface PageHeaderProps {
  title: string;
  accentTitle?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, accentTitle, subtitle, icon, rightElement }) => {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      flexWrap: 'wrap',
      gap: '20px'
    }} className="flex-mobile-column">
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {icon && (
          <div style={{ 
            background: 'var(--accent-glow)', 
            padding: '14px', 
            borderRadius: '16px', 
            color: 'var(--accent-color)', 
            boxShadow: '0 8px 20px var(--accent-glow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {React.cloneElement(icon as any, { size: 28 })}
          </div>
        )}
        <div>
          <h1 style={{ 
            margin: 0, 
            fontSize: '2.5rem', 
            fontWeight: 800, 
            letterSpacing: '-1px',
            lineHeight: 1.1,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ color: '#ffffff' }}>{title}</span>
            {accentTitle && <span style={{ color: 'var(--accent-color)' }}>{accentTitle}</span>}
          </h1>
          {subtitle && (
            <p style={{ 
              color: 'var(--text-secondary)', 
              marginTop: '6px', 
              margin: 0, 
              fontSize: '1rem',
              fontWeight: 500,
              letterSpacing: '0.5px'
            }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      
      {rightElement && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }} className="full-width-mobile">
          {rightElement}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
