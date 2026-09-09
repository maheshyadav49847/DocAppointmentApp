import { useEffect, useState } from 'react';

const TelegramBookingForm = () => {
  const [queues, setQueues] = useState<any[]>([]);
  const [selectedQueue, setSelectedQueue] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Extract branchId from URL
  const searchParams = new URLSearchParams(window.location.search);
  const branchId = searchParams.get('branchId');

  useEffect(() => {
    // 1. Initialize Telegram
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-web-app.js';
    script.async = true;
    script.onload = () => {
      const tg = (window as any).Telegram?.WebApp;
      if (tg) {
        tg.ready();
        tg.expand();
      }
    };
    document.body.appendChild(script);

    // 2. Fetch Active Queues from Backend anonymously
    if (branchId) {
        fetch(`${import.meta.env.VITE_API_URL}/queue/branch/${branchId}/active`)
        .then(res => res.json())
        .then(data => {
            setQueues(data);
            if (data && data.length > 0) {
                setSelectedQueue(data[0].id);
            }
            setLoading(false);
        })
        .catch(err => {
            setError('Failed to load active sessions.');
            setLoading(false);
            console.error(err);
        });
    } else {
        setError('Invalid link. Branch ID missing.');
        setLoading(false);
    }

    return () => {
      document.body.removeChild(script);
    };
  }, [branchId]);

  const handleBook = () => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) {
      alert("Please open this from Telegram!");
      return;
    }

    if (!selectedQueue) {
        alert("Please select a session.");
        return;
    }

    const bookingData = {
      action: 'book',
      queueId: selectedQueue,
    };

    // Send data back to the bot
    tg.sendData(JSON.stringify(bookingData));
  };

  if (loading) {
      return <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>Loading sessions...</div>;
  }

  if (error) {
      return <div style={{ padding: '20px', fontFamily: 'sans-serif', color: 'red' }}>{error}</div>;
  }

  if (queues.length === 0) {
      return <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>No active sessions available right now. Please try again later.</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: 'var(--tg-theme-bg-color, #ffffff)', color: 'var(--tg-theme-text-color, #000000)', minHeight: '100vh' }}>
      <h2 style={{ color: 'var(--tg-theme-text-color, #000000)', marginBottom: '20px' }}>Book Fast Appointment</h2>
      
      <div style={{ marginTop: '20px' }}>
        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Select Available Doctor / Session:</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {queues.map(q => (
                <div 
                    key={q.id} 
                    onClick={() => setSelectedQueue(q.id)}
                    style={{ 
                        padding: '15px', 
                        border: selectedQueue === q.id ? '2px solid var(--tg-theme-button-color, #2481cc)' : '1px solid #ccc', 
                        borderRadius: '8px', 
                        backgroundColor: selectedQueue === q.id ? 'var(--tg-theme-secondary-bg-color, #e3f2fd)' : 'var(--tg-theme-bg-color, #ffffff)',
                        cursor: 'pointer'
                    }}
                >
                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{q.doctorName || 'Unknown Doctor'} {q.specialty ? `(${q.specialty})` : ''}</div>
                    <div style={{ fontSize: '14px', color: '#0056b3', marginTop: '4px' }}>
                        {q.sessionName ? `${q.sessionName} Session ` : ''} 
                        {q.sessionStart && q.sessionEnd ? `(${q.sessionStart} - ${q.sessionEnd})` : ''}
                    </div>
                    <div style={{ fontSize: '13px', color: '#666', marginTop: '5px' }}>Current Token: {q.currentTokenNumber || 0}</div>
                    <div style={{ fontSize: '13px', color: '#666' }}>Pending: {q.pendingCount || 0}</div>
                </div>
            ))}
        </div>
      </div>

      <button 
        onClick={handleBook} 
        style={{ 
          marginTop: '30px', 
          width: '100%', 
          padding: '15px', 
          backgroundColor: 'var(--tg-theme-button-color, #2481cc)', 
          color: 'var(--tg-theme-button-text-color, #ffffff)', 
          border: 'none', 
          borderRadius: '8px', 
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        Confirm Booking
      </button>
    </div>
  );
};

export default TelegramBookingForm;
