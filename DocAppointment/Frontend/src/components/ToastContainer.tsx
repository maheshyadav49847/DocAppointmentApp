import React from 'react';
import { useNotificationStore } from '../stores/notificationStore';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import './ToastContainer.css';

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useNotificationStore();

  return (
    <div className="toast-container-wrapper">
      {toasts.map((toast) => {
        let Icon = Info;
        let color = 'var(--accent-color)';
        
        if (toast.type === 'success') {
          Icon = CheckCircle2;
          color = 'var(--success)';
        } else if (toast.type === 'danger') {
          Icon = AlertCircle;
          color = 'var(--danger)';
        } else if (toast.type === 'warning') {
          Icon = AlertTriangle;
          color = '#FACC15'; // Yellow
        }

        return (
          <div 
            key={toast.id} 
            className={`glass-card toast-item toast-${toast.type}`} 
          >
            <div className="toast-icon-wrapper">
               <Icon size={20} color={color} />
            </div>
            <div className="toast-content">
              <h4 className="toast-title">{toast.title}</h4>
              <p className="toast-message">{toast.message}</p>
            </div>
            <button 
              onClick={() => removeToast(toast.id)}
              className="toast-close-btn"
            >
               <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;
