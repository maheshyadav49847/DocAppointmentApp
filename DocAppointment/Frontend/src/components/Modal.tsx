import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  icon?: React.ReactNode;
  maxWidth?: string;
}

const Modal: React.FC<ModalProps> = ({ title, children, onClose, icon, maxWidth }) => {
  return createPortal(
    <div 
      onClick={onClose}
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        background: 'rgba(0, 0, 0, 0.8)', 
        backdropFilter: 'blur(10px)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        zIndex: 99999,
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="modal-card responsive-modal" 
        style={{ 
          width: '100%', 
          maxWidth: maxWidth || '450px', 
          margin: '0 20px', 
          padding: '35px', 
          position: 'relative'
        }}
      >
        <button 
          onClick={onClose} 
          style={{ 
            position: 'absolute', 
            top: '20px', 
            right: '20px', 
            background: 'none', 
            border: 'none', 
            color: 'var(--text-secondary)', 
            cursor: 'pointer',
            padding: '5px',
            borderRadius: '8px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)', e.currentTarget.style.color = 'white')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none', e.currentTarget.style.color = 'var(--text-secondary)')}
        >
          <X size={20} />
        </button>
        
        <h2 style={{ marginBottom: '25px', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {icon}
          {title}
        </h2>
        
        {children}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
