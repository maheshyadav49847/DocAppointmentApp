import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import './Modal.css';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  icon?: React.ReactNode;
  maxWidth?: string;
}

const Modal: React.FC<ModalProps> = ({ title, children, onClose, icon, maxWidth }) => {
  return createPortal(
    <div onClick={onClose} className="modal-overlay">
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`modal-card responsive-modal modal-content-card modal-${maxWidth || '450px'}`} 
      >
        <button onClick={onClose} className="modal-close-btn">
          <X size={20} />
        </button>
        
        <h2 className="modal-title">
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
