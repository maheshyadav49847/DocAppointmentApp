import { useEffect, useState } from 'react';

const TelegramBookingForm = () => {
  const [date, setDate] = useState('');
  const [doctor, setDoctor] = useState('Dr. Sharma (Cardio)');

  useEffect(() => {
    // Add the Telegram Web App script dynamically
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

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleBook = () => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) {
      alert("Please open this from Telegram!");
      return;
    }

    const bookingData = {
      doctorId: doctor,
      bookingDate: date,
      isTelegramWebApp: true
    };

    // Send data back to the bot
    tg.sendData(JSON.stringify(bookingData));
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: 'var(--tg-theme-bg-color, #ffffff)', color: 'var(--tg-theme-text-color, #000000)', minHeight: '100vh' }}>
      <h2 style={{ color: 'var(--tg-theme-text-color, #000000)' }}>Book Appointment</h2>
      
      <div style={{ marginTop: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Select Doctor:</label>
        <select 
          value={doctor} 
          onChange={(e) => setDoctor(e.target.value)}
          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', backgroundColor: 'var(--tg-theme-secondary-bg-color, #f4f4f5)', color: 'var(--tg-theme-text-color, #000)' }}
        >
          <option>Dr. Sharma (Cardio)</option>
          <option>Dr. Verma (Ortho)</option>
        </select>
      </div>

      <div style={{ marginTop: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Select Date:</label>
        <input 
          type="date" 
          value={date} 
          onChange={(e) => setDate(e.target.value)} 
          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', backgroundColor: 'var(--tg-theme-secondary-bg-color, #f4f4f5)', color: 'var(--tg-theme-text-color, #000)' }}
        />
      </div>

      <button 
        onClick={handleBook} 
        style={{ 
          marginTop: '30px', 
          width: '100%', 
          padding: '12px', 
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
