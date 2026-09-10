import { useEffect, useState } from 'react';

// ─── Translations ───────────────────────────────────────────
const T: Record<string, Record<string, string>> = {
  en: {
    title: 'Book Appointment',
    subtitle: 'Select your doctor and confirm',
    selectLabel: 'Available Doctors',
    currentToken: 'Current Token',
    waiting: 'Waiting',
    confirmBtn: 'Confirm Booking',
    bookingBtn: 'Booking...',
    loading: 'Loading available sessions...',
    noSessions: 'No active sessions right now. Please try later.',
    invalidLink: 'Invalid link. Branch ID is missing.',
    selectAlert: 'Please select a session.',
    networkError: 'Network error. Please try again.',
    bookingFailed: 'Booking failed. Please try again.',
    successTitle: 'Appointment Confirmed!',
    successToken: 'Your Token Number',
    successDoctor: 'Doctor',
    successWait: 'Please visit the clinic and wait for your turn.',
    alreadyTitle: 'Already Booked!',
    alreadyMsg: 'You already have an active token for this session.',
    session: 'Session',
  },
  hi: {
    title: 'अपॉइंटमेंट बुक करें',
    subtitle: 'अपने डॉक्टर को चुनें और कन्फर्म करें',
    selectLabel: 'उपलब्ध डॉक्टर',
    currentToken: 'वर्तमान टोकन',
    waiting: 'प्रतीक्षा में',
    confirmBtn: 'बुकिंग कन्फर्म करें',
    bookingBtn: 'बुक हो रहा है...',
    loading: 'उपलब्ध सत्र लोड हो रहे हैं...',
    noSessions: 'अभी कोई सक्रिय सत्र नहीं है। कृपया बाद में कोशिश करें।',
    invalidLink: 'अमान्य लिंक। ब्रांच ID गायब है।',
    selectAlert: 'कृपया एक सत्र चुनें।',
    networkError: 'नेटवर्क त्रुटि। कृपया पुनः प्रयास करें।',
    bookingFailed: 'बुकिंग विफल रही। कृपया पुनः प्रयास करें।',
    successTitle: 'अपॉइंटमेंट कन्फर्म!',
    successToken: 'आपका टोकन नंबर',
    successDoctor: 'डॉक्टर',
    successWait: 'कृपया क्लिनिक पर आकर अपनी बारी का इंतज़ार करें।',
    alreadyTitle: 'पहले से बुक है!',
    alreadyMsg: 'इस सत्र के लिए आपका टोकन पहले से मौजूद है।',
    session: 'सत्र',
  },
};

// ─── Component ──────────────────────────────────────────────
const TelegramBookingForm = () => {
  const [queues, setQueues] = useState<any[]>([]);
  const [selectedQueue, setSelectedQueue] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);
  const [alreadyBooked, setAlreadyBooked] = useState(false);
  const [tokenNumber, setTokenNumber] = useState(0);
  const [doctorName, setDoctorName] = useState('');

  const searchParams = new URLSearchParams(window.location.search);
  const branchId = searchParams.get('branchId');
  const chatId = searchParams.get('chatId') || '';
  const lang = searchParams.get('lang') || 'en';
  const t = T[lang] || T['en'];

  useEffect(() => {
    // Initialize Telegram WebApp
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-web-app.js';
    script.async = true;
    script.onload = () => {
      const tg = (window as any).Telegram?.WebApp;
      if (tg) { tg.ready(); tg.expand(); }
    };
    document.body.appendChild(script);

    // Fetch active queues
    if (branchId) {
      fetch(`${import.meta.env.VITE_API_URL}/queue/branch/${branchId}/active`)
        .then(res => res.json())
        .then(data => {
          setQueues(data);
          if (data?.length > 0) setSelectedQueue(data[0].id);
          setLoading(false);
        })
        .catch(() => { setError(t.noSessions); setLoading(false); });
    } else {
      setError(t.invalidLink);
      setLoading(false);
    }

    return () => { document.body.removeChild(script); };
  }, [branchId]);

  const handleBook = async () => {
    if (!selectedQueue) { alert(t.selectAlert); return; }
    setBooking(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/queue/${selectedQueue}/book-anonymous?chatId=${encodeURIComponent(chatId)}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      );
      if (res.ok) {
        const data = await res.json();
        setTokenNumber(data.tokenNumber);
        setDoctorName(data.doctorName || '');
        if (data.alreadyBooked) {
          setAlreadyBooked(true);
        }
        setBooked(true);
        // Close Telegram WebApp after delay
        const tg = (window as any).Telegram?.WebApp;
        if (tg?.close) setTimeout(() => tg.close(), 3000);
      } else {
        alert(t.bookingFailed);
      }
    } catch { alert(t.networkError); }
    setBooking(false);
  };

  // ─── CSS-in-JS styles ───────────────────────────────────
  const styles = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0fdfa 100%)',
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      padding: 0,
      margin: 0,
    } as React.CSSProperties,
    header: {
      background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
      padding: '28px 20px 24px',
      borderRadius: '0 0 24px 24px',
      boxShadow: '0 4px 20px rgba(14, 165, 233, 0.25)',
      position: 'relative' as const,
      overflow: 'hidden',
    } as React.CSSProperties,
    headerPattern: {
      position: 'absolute' as const,
      top: 0, right: 0, bottom: 0, left: 0,
      background: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.15) 0%, transparent 50%)',
      pointerEvents: 'none' as const,
    } as React.CSSProperties,
    headerIcon: {
      fontSize: '36px',
      marginBottom: '8px',
      display: 'block',
    } as React.CSSProperties,
    headerTitle: {
      color: '#fff',
      fontSize: '22px',
      fontWeight: 700,
      margin: 0,
      position: 'relative' as const,
    } as React.CSSProperties,
    headerSub: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: '14px',
      marginTop: '4px',
      position: 'relative' as const,
    } as React.CSSProperties,
    body: {
      padding: '20px 16px',
    } as React.CSSProperties,
    label: {
      fontSize: '15px',
      fontWeight: 600,
      color: '#334155',
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    } as React.CSSProperties,
    card: (selected: boolean) => ({
      padding: '16px',
      borderRadius: '14px',
      border: selected ? '2px solid #0ea5e9' : '1.5px solid #e2e8f0',
      backgroundColor: selected ? '#f0f9ff' : '#ffffff',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: selected ? '0 4px 14px rgba(14, 165, 233, 0.15)' : '0 1px 4px rgba(0,0,0,0.04)',
      transform: selected ? 'scale(1.01)' : 'scale(1)',
      position: 'relative' as const,
      overflow: 'hidden',
    } as React.CSSProperties),
    cardCheck: {
      position: 'absolute' as const,
      top: '12px',
      right: '12px',
      width: '22px',
      height: '22px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontSize: '12px',
      fontWeight: 700,
    } as React.CSSProperties,
    doctorRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    } as React.CSSProperties,
    doctorIcon: {
      width: '44px',
      height: '44px',
      borderRadius: '12px',
      background: 'linear-gradient(135deg, #dbeafe, #e0f2fe)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '22px',
      flexShrink: 0,
    } as React.CSSProperties,
    doctorName: {
      fontWeight: 700,
      fontSize: '16px',
      color: '#1e293b',
    } as React.CSSProperties,
    specialization: {
      fontSize: '13px',
      color: '#64748b',
      marginTop: '2px',
    } as React.CSSProperties,
    sessionBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
      color: '#047857',
      fontSize: '12px',
      fontWeight: 600,
      padding: '4px 10px',
      borderRadius: '20px',
      marginTop: '10px',
    } as React.CSSProperties,
    statsRow: {
      display: 'flex',
      gap: '16px',
      marginTop: '10px',
    } as React.CSSProperties,
    stat: {
      fontSize: '12px',
      color: '#94a3b8',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    } as React.CSSProperties,
    statValue: {
      fontWeight: 700,
      color: '#475569',
      fontSize: '14px',
    } as React.CSSProperties,
    btn: (disabled: boolean) => ({
      marginTop: '24px',
      width: '100%',
      padding: '16px',
      background: disabled
        ? '#94a3b8'
        : 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
      color: '#fff',
      border: 'none',
      borderRadius: '14px',
      fontSize: '16px',
      fontWeight: 700,
      cursor: disabled ? 'not-allowed' : 'pointer',
      boxShadow: disabled ? 'none' : '0 4px 14px rgba(14, 165, 233, 0.35)',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
    } as React.CSSProperties),
    // Success screen
    successPage: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      textAlign: 'center' as const,
    } as React.CSSProperties,
    successCircle: (isAlready: boolean) => ({
      width: '100px',
      height: '100px',
      borderRadius: '50%',
      background: isAlready
        ? 'linear-gradient(135deg, #f59e0b, #d97706)'
        : 'linear-gradient(135deg, #10b981, #059669)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '48px',
      marginBottom: '24px',
      boxShadow: isAlready
        ? '0 8px 30px rgba(245, 158, 11, 0.3)'
        : '0 8px 30px rgba(16, 185, 129, 0.3)',
      animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    } as React.CSSProperties),
    tokenBig: {
      fontSize: '56px',
      fontWeight: 800,
      background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      lineHeight: 1.1,
    } as React.CSSProperties,
    // Loading
    loadingPage: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
    } as React.CSSProperties,
    spinner: {
      width: '40px',
      height: '40px',
      border: '4px solid #e2e8f0',
      borderTopColor: '#0ea5e9',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    } as React.CSSProperties,
  };

  // ─── Loading State ──────────────────────────────────────
  if (loading) {
    return (
      <div style={{ ...styles.page, ...styles.loadingPage }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes popIn { from { transform: scale(0); } to { transform: scale(1); } }`}</style>
        <div style={styles.spinner}></div>
        <div style={{ color: '#64748b', fontSize: '15px' }}>{t.loading}</div>
      </div>
    );
  }

  // ─── Error State ────────────────────────────────────────
  if (error) {
    return (
      <div style={{ ...styles.page, ...styles.loadingPage }}>
        <div style={{ fontSize: '48px' }}>😔</div>
        <div style={{ color: '#ef4444', fontSize: '15px', maxWidth: '280px' }}>{error}</div>
      </div>
    );
  }

  // ─── No Sessions ────────────────────────────────────────
  if (queues.length === 0) {
    return (
      <div style={{ ...styles.page, ...styles.loadingPage }}>
        <div style={{ fontSize: '48px' }}>🏥</div>
        <div style={{ color: '#64748b', fontSize: '15px', maxWidth: '280px', textAlign: 'center' }}>{t.noSessions}</div>
      </div>
    );
  }

  // ─── Success / Already Booked State ─────────────────────
  if (booked) {
    return (
      <div style={{ ...styles.page, ...styles.successPage, background: alreadyBooked ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' : 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #f0fdfa 100%)' }}>
        <style>{`@keyframes popIn { from { transform: scale(0); } to { transform: scale(1); } }`}</style>
        <div style={styles.successCircle(alreadyBooked)}>
          {alreadyBooked ? '⚠️' : '✅'}
        </div>
        <h2 style={{ color: alreadyBooked ? '#92400e' : '#065f46', fontSize: '22px', fontWeight: 700, margin: '0 0 8px' }}>
          {alreadyBooked ? t.alreadyTitle : t.successTitle}
        </h2>
        {alreadyBooked && (
          <p style={{ color: '#a16207', fontSize: '14px', margin: '0 0 20px', maxWidth: '280px' }}>{t.alreadyMsg}</p>
        )}
        <div style={{ marginTop: '8px', color: '#64748b', fontSize: '14px' }}>{t.successToken}</div>
        <div style={styles.tokenBig}>{tokenNumber}</div>
        {doctorName && (
          <div style={{ marginTop: '16px', color: '#475569', fontSize: '15px' }}>
            <span style={{ color: '#94a3b8' }}>{t.successDoctor}: </span>
            <strong>{doctorName}</strong>
          </div>
        )}
        <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '24px', maxWidth: '260px' }}>{t.successWait}</p>
      </div>
    );
  }

  // ─── Main Booking Form ──────────────────────────────────
  return (
    <div style={styles.page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerPattern}></div>
        <span style={styles.headerIcon}>🏥</span>
        <h1 style={styles.headerTitle}>{t.title}</h1>
        <p style={styles.headerSub}>{t.subtitle}</p>
      </div>

      {/* Body */}
      <div style={styles.body}>
        <div style={styles.label}>
          <span>🩺</span> {t.selectLabel}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {queues.map(q => (
            <div
              key={q.id}
              onClick={() => setSelectedQueue(q.id)}
              style={styles.card(selectedQueue === q.id)}
            >
              {selectedQueue === q.id && (
                <div style={styles.cardCheck}>✓</div>
              )}
              <div style={styles.doctorRow}>
                <div style={styles.doctorIcon}>🩺</div>
                <div>
                  <div style={styles.doctorName}>{q.doctorName || 'Unknown'}</div>
                  {q.specialty && <div style={styles.specialization}>{q.specialty}</div>}
                </div>
              </div>

              {(q.sessionName || (q.sessionStart && q.sessionEnd)) && (
                <div style={styles.sessionBadge}>
                  🕐 {q.sessionName ? `${q.sessionName} ${t.session}` : ''} {q.sessionStart && q.sessionEnd ? `(${q.sessionStart} - ${q.sessionEnd})` : ''}
                </div>
              )}

              <div style={styles.statsRow}>
                <div style={styles.stat}>
                  <span>🎫</span> {t.currentToken}: <span style={styles.statValue}>{q.currentTokenNumber || 0}</span>
                </div>
                <div style={styles.stat}>
                  <span>⏳</span> {t.waiting}: <span style={styles.statValue}>{q.waitingCount || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleBook}
          disabled={booking || !selectedQueue}
          style={styles.btn(booking || !selectedQueue)}
        >
          {booking ? (
            <>
              <div style={{ ...styles.spinner, width: '20px', height: '20px', borderWidth: '3px' }}></div>
              {t.bookingBtn}
            </>
          ) : (
            <>{t.confirmBtn}</>
          )}
        </button>
      </div>
    </div>
  );
};

export default TelegramBookingForm;
