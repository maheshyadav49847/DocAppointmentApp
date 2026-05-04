import React from 'react';
import { useNotificationStore } from '../stores/notificationStore';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useNotificationStore();

  return (
    <div style={{
      position: 'fixed',
      bottom: '30px',
      right: '30px',
      zIndex: 100000,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      pointerEvents: 'none' // Let clicks pass through empty space
    }}>
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
            className="glass-card" 
            style={{ 
              padding: '15px 20px', 
              borderLeft: `4px solid ${color}`,
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: '12px', 
              animation: 'slideInRight 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)', 
              minWidth: '320px',
              maxWidth: '400px',
              background: 'rgba(15, 23, 42, 0.95)', 
              backdropFilter: 'blur(10px)',
              pointerEvents: 'auto', // Re-enable pointer events for the toast itself
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{ marginTop: '2px' }}>
               <Icon size={20} color={color} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', color: 'white' }}>{toast.title}</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{toast.message}</p>
            </div>
            <button 
              onClick={() => removeToast(toast.id)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}
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
