import React from 'react';
import './PageHeader.css';

interface PageHeaderProps {
  title: string;
  accentTitle?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, accentTitle, subtitle, icon, rightElement }) => {
  return (
    <div className="page-header-container flex-mobile-column">
      <div className="page-header-left">
        {icon && (
          <div className="page-header-icon-box">
            {React.cloneElement(icon as any, { size: 28 })}
          </div>
        )}
        <div>
          <h1 className="page-header-title">
            <span className="page-header-title-main">{title}</span>
            {accentTitle && <span className="page-header-title-accent">{accentTitle}</span>}
          </h1>
          {subtitle && (
            <p className="page-header-subtitle">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      
      {rightElement && (
        <div className="page-header-right full-width-mobile">
          {rightElement}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
