import { useEffect, useState } from 'react';

// ─── Translations ───────────────────────────────────────────
const T: Record<string, Record<string, string>> = {
  hi: {
    title: 'अपॉइंटमेंट बुक करें',
    subtitle: 'अपने डॉक्टर को चुनें और कन्फर्म करें',
    selectLabel: 'उपलब्ध डॉक्टर व सत्र',
    currentToken: 'वर्तमान टोकन',
    waiting: 'प्रतीक्षा में',
    confirmBtn: 'बुकिंग कन्फर्म करें',
    bookingBtn: 'बुक हो रहा है...',
    loading: 'उपलब्ध सत्र लोड हो रहे हैं...',
    noSessions: 'अभी कोई सक्रिय सत्र नहीं है। कृपया बाद में कोशिश करें।',
    invalidLink: 'अमान्य लिंक। ब्रांच ID उपलब्ध नहीं है।',
    selectAlert: 'कृपया एक सत्र चुनें।',
    networkError: 'नेटवर्क त्रुटि। कृपया पुनः प्रयास करें।',
    bookingFailed: 'बुकिंग विफल रही। कृपया पुनः प्रयास करें।',
    successTitle: 'अपॉइंटमेंट कन्फर्म!',
    successToken: 'आपका टोकन नंबर',
    successDoctor: 'डॉक्टर',
    patientName: 'मरीज़ का नाम',
    successWait: 'कृपया क्लिनिक पर आकर अपनी बारी का इंतज़ार करें।',
    alreadyTitle: 'आपकी बुकिंग पहले से मौजूद है!',
    alreadyMsg: 'आपका टोकन इस सत्र के लिए पहले ही बुक हो चुका है।',
    alreadyRunningToken: 'वर्तमान चल रहा टोकन',
    alreadySession: 'सत्र',
    session: 'सत्र',
    cancelBtn: 'अपॉइंटमेंट रद्द करें',
    cancellingBtn: 'रद्द हो रहा है...',
    cancelConfirm: 'क्या आप वाकई अपनी अपॉइंटमेंट रद्द (Cancel) करना चाहते हैं?',
    cancelSuccess: 'आपकी अपॉइंटमेंट रद्द कर दी गई है।',
    bookNewBtn: 'नई अपॉइंटमेंट बुक करें',
    statusPending: 'कतार में है (Waiting)',
  },
  mr: {
    title: 'अपॉइंटमेंट बुक करा',
    subtitle: 'आपले डॉक्टर निवडा आणि कन्फर्म करा',
    selectLabel: 'उपलब्ध डॉक्टर आणि सत्र',
    currentToken: 'चालू टोकन',
    waiting: 'प्रतीक्षेत',
    confirmBtn: 'बुकिंग कन्फर्म करा',
    bookingBtn: 'बुक होत आहे...',
    loading: 'उपलब्ध सत्र लोड होत आहेत...',
    noSessions: 'सध्या कोणतेही सक्रिय सत्र नाही. कृपया नंतर प्रयत्न करा.',
    invalidLink: 'अवैध लिंक. ब्रांच ID उपलब्ध नाही.',
    selectAlert: 'कृपया एक सत्र निवडा.',
    networkError: 'नेटवर्क त्रुटी. कृपया पुन्हा प्रयत्न करा.',
    bookingFailed: 'बुकिंग अयशस्वी. कृपया पुन्हा प्रयत्न करा.',
    successTitle: 'अपॉइंटमेंट कन्फर्म झाली!',
    successToken: 'तुमचा टोकन नंबर',
    successDoctor: 'डॉक्टर',
    patientName: 'रुग्णाचे नाव',
    successWait: 'कृपया क्लिनिकमध्ये येऊन आपल्या पाळीची वाट पहा.',
    alreadyTitle: 'तुमची बुकिंग आधीच झाली आहे!',
    alreadyMsg: 'या सत्रासाठी तुमचा टोकन आधीच बुक केला गेला आहे.',
    alreadyRunningToken: 'सध्या चालू असलेला टोकन',
    alreadySession: 'सत्र',
    session: 'सत्र',
    cancelBtn: 'अपॉइंटमेंट रद्द करा',
    cancellingBtn: 'रद्द होत आहे...',
    cancelConfirm: 'तुम्हाला नक्की तुमची अपॉइंटमेंट रद्द करायची आहे का?',
    cancelSuccess: 'तुमची अपॉइंटमेंट रद्द झाली आहे.',
    bookNewBtn: 'नवीन अपॉइंटमेंट बुक करा',
    statusPending: 'रांगेत आहे (Waiting)',
  },
  en: {
    title: 'Book Appointment',
    subtitle: 'Select your doctor and confirm',
    selectLabel: 'Available Doctors & Sessions',
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
    patientName: 'Patient Name',
    successWait: 'Please visit the clinic and wait for your turn.',
    alreadyTitle: 'Active Booking Found',
    alreadyMsg: 'You already have an active token for today.',
    alreadyRunningToken: 'Currently Serving Token',
    alreadySession: 'Session',
    session: 'Session',
    cancelBtn: 'Cancel Appointment',
    cancellingBtn: 'Cancelling...',
    cancelConfirm: 'Are you sure you want to cancel this appointment?',
    cancelSuccess: 'Your appointment has been cancelled successfully.',
    bookNewBtn: 'Book New Appointment',
    statusPending: 'In Queue (Waiting)',
  },
};

const normalizeLang = (raw: string | null): string => {
  if (!raw) return 'hi';
  const l = raw.toLowerCase().trim();
  if (l === '1' || l.startsWith('hi')) return 'hi';
  if (l === '2' || l.startsWith('mr')) return 'mr';
  if (l === '3' || l.startsWith('en')) return 'en';
  return 'hi';
};

// ─── Component ──────────────────────────────────────────────
const TelegramBookingForm = () => {
  const [queues, setQueues] = useState<any[]>([]);
  const [selectedQueue, setSelectedQueue] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [booked, setBooked] = useState(false);
  const [alreadyBooked, setAlreadyBooked] = useState(false);
  const [tokenNumber, setTokenNumber] = useState(0);
  const [doctorName, setDoctorName] = useState('');
  const [patientName, setPatientName] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [currentRunningToken, setCurrentRunningToken] = useState(0);

  const searchParams = new URLSearchParams(window.location.search);
  const branchId = searchParams.get('branchId');
  const chatId = searchParams.get('chatId') || '';

  // Language management: prioritize saved preference or URL param (default 'hi')
  const [currentLang, setCurrentLang] = useState<string>(() => {
    const saved = localStorage.getItem('tg_booking_lang');
    if (saved) return normalizeLang(saved);
    const urlLang = searchParams.get('lang');
    if (urlLang) return normalizeLang(urlLang);
    return 'hi';
  });

  const t = T[currentLang] || T['hi'];

  const changeLanguage = (newLang: string) => {
    setCurrentLang(newLang);
    localStorage.setItem('tg_booking_lang', newLang);
  };

  const loadActiveQueues = async () => {
    if (!branchId) return;
    try {
      const queueRes = await fetch(`${import.meta.env.VITE_API_URL}/queue/branch/${branchId}/active`);
      if (queueRes.ok) {
        const data = await queueRes.json();
        setQueues(data || []);
        if (data?.length > 0) setSelectedQueue(data[0].id);
      } else {
        setError(t.noSessions);
      }
    } catch {
      setError(t.noSessions);
    }
  };

  useEffect(() => {
    // 1. Initialize Telegram WebApp
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

    if (!branchId) {
      setError(t.invalidLink);
      setLoading(false);
      return;
    }

    // 2. Scenario 1 Check: Check if user already has an active booking for today
    const checkActiveBookingAndLoadQueues = async () => {
      try {
        if (chatId) {
          const bookingCheckRes = await fetch(
            `${import.meta.env.VITE_API_URL}/queue/branch/${branchId}/active-booking?chatId=${encodeURIComponent(chatId)}`
          );
          if (bookingCheckRes.ok) {
            const checkData = await bookingCheckRes.json();
            if (checkData.patientName) {
              setPatientName(checkData.patientName);
            }
            if (checkData.preferredLanguage) {
              const pLang = normalizeLang(checkData.preferredLanguage);
              setCurrentLang(pLang);
              localStorage.setItem('tg_booking_lang', pLang);
            }
            if (checkData.hasActiveBooking) {
              setTokenNumber(checkData.tokenNumber);
              setDoctorName(checkData.doctorName || '');
              setSessionName(checkData.sessionName || '');
              setCurrentRunningToken(checkData.currentTokenNumber || 0);
              setAlreadyBooked(true);
              setBooked(true);
              setLoading(false);
              return; // Form expires & shows existing booking details directly!
            }
          }
        }

        // 3. Load active queues if no active booking exists
        await loadActiveQueues();
      } catch (err) {
        console.error(err);
        setError(t.noSessions);
      } finally {
        setLoading(false);
      }
    };

    checkActiveBookingAndLoadQueues();

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [branchId, chatId]);

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
        if (data.patientName) {
          setPatientName(data.patientName);
        }
        if (data.alreadyBooked) {
          setAlreadyBooked(true);
        }
        setBooked(true);
      } else {
        alert(t.bookingFailed);
      }
    } catch { 
      alert(t.networkError); 
    } finally {
      setBooking(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!window.confirm(t.cancelConfirm)) return;
    setCancelling(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/queue/branch/${branchId}/cancel-booking?chatId=${encodeURIComponent(chatId)}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      );
      if (res.ok) {
        alert(t.cancelSuccess);
        // Reset state so user can book again!
        setBooked(false);
        setAlreadyBooked(false);
        setTokenNumber(0);
        setDoctorName('');
        setSessionName('');
        setCurrentRunningToken(0);
        setLoading(true);
        await loadActiveQueues();
        setLoading(false);
      } else {
        alert(t.bookingFailed);
      }
    } catch {
      alert(t.networkError);
    } finally {
      setCancelling(false);
    }
  };

  // ─── Application Theme CSS (DocAppointment Indigo Theme) ─────────
  const styles = {
    page: {
      minHeight: '100vh',
      backgroundColor: '#f8fafc', // slate-50
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      color: '#0f172a', // slate-900
      padding: 0,
      margin: 0,
    } as React.CSSProperties,
    header: {
      background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 60%, #3b82f6 100%)', // DocAppointment Indigo
      padding: '24px 20px 22px',
      borderRadius: '0 0 20px 20px',
      boxShadow: '0 4px 16px rgba(37, 99, 235, 0.20)',
      position: 'relative' as const,
      overflow: 'hidden',
    } as React.CSSProperties,
    headerTopRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px',
      position: 'relative' as const,
    } as React.CSSProperties,
    brandBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      backgroundColor: 'rgba(255, 255, 255, 0.18)',
      padding: '4px 10px',
      borderRadius: '8px',
      color: '#ffffff',
      fontSize: '12px',
      fontWeight: 700,
      letterSpacing: '0.02em',
    } as React.CSSProperties,
    langPillContainer: {
      display: 'inline-flex',
      backgroundColor: '#ffffff',
      borderRadius: '24px',
      padding: '3px',
      border: '1.5px solid #cbd5e1',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.10)',
    } as React.CSSProperties,
    langBtn: (active: boolean) => ({
      border: 'none',
      background: active ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'transparent',
      color: active ? '#ffffff' : '#334155',
      fontWeight: active ? 700 : 600,
      fontSize: '12px',
      padding: '5px 12px',
      borderRadius: '20px',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      boxShadow: active ? '0 2px 6px rgba(37, 99, 235, 0.35)' : 'none',
    } as React.CSSProperties),
    headerTitle: {
      color: '#ffffff',
      fontSize: '22px',
      fontWeight: 700,
      margin: 0,
      letterSpacing: '-0.02em',
    } as React.CSSProperties,
    headerSub: {
      color: 'rgba(255, 255, 255, 0.90)',
      fontSize: '13px',
      marginTop: '4px',
      fontWeight: 500,
    } as React.CSSProperties,
    body: {
      padding: '20px 16px 40px',
      maxWidth: '480px',
      margin: '0 auto',
    } as React.CSSProperties,
    label: {
      fontSize: '14px',
      fontWeight: 600,
      color: '#475569', // slate-600
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.04em',
    } as React.CSSProperties,
    card: (selected: boolean) => ({
      padding: '16px',
      borderRadius: '16px',
      border: selected ? '2px solid #2563eb' : '1px solid #e2e8f0',
      backgroundColor: selected ? '#eff6ff' : '#ffffff',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      boxShadow: selected ? '0 4px 16px rgba(37, 99, 235, 0.12)' : '0 1px 3px rgba(0, 0, 0, 0.04)',
      position: 'relative' as const,
    } as React.CSSProperties),
    cardCheck: {
      position: 'absolute' as const,
      top: '14px',
      right: '14px',
      width: '22px',
      height: '22px',
      borderRadius: '50%',
      backgroundColor: '#2563eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffffff',
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
      backgroundColor: '#dbeafe', // blue-100
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '22px',
      flexShrink: 0,
      color: '#1d4ed8',
    } as React.CSSProperties,
    doctorName: {
      fontWeight: 700,
      fontSize: '16px',
      color: '#0f172a',
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
      backgroundColor: '#ecfdf5', // emerald-50
      color: '#047857', // emerald-700
      border: '1px solid #a7f3d0',
      fontSize: '12px',
      fontWeight: 600,
      padding: '4px 10px',
      borderRadius: '12px',
      marginTop: '10px',
    } as React.CSSProperties,
    statsRow: {
      display: 'flex',
      gap: '14px',
      marginTop: '12px',
      paddingTop: '10px',
      borderTop: '1px solid #f1f5f9',
    } as React.CSSProperties,
    stat: {
      fontSize: '12px',
      color: '#64748b',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    } as React.CSSProperties,
    statValue: {
      fontWeight: 700,
      color: '#1e293b',
      fontSize: '13px',
    } as React.CSSProperties,
    primaryBtn: (disabled: boolean) => ({
      marginTop: '24px',
      width: '100%',
      padding: '14px',
      backgroundColor: disabled ? '#94a3b8' : '#2563eb', // Indigo 600
      color: '#ffffff',
      border: 'none',
      borderRadius: '12px',
      fontSize: '15px',
      fontWeight: 700,
      cursor: disabled ? 'not-allowed' : 'pointer',
      boxShadow: disabled ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.30)',
      transition: 'all 0.15s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
    } as React.CSSProperties),
    cancelBtn: {
      marginTop: '14px',
      width: '100%',
      padding: '12px',
      backgroundColor: '#fef2f2',
      color: '#dc2626',
      border: '1px solid #fecaca',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
    } as React.CSSProperties,
    // Active Booking Page (Clean Application Style)
    bookedContainer: {
      padding: '24px 16px',
      maxWidth: '480px',
      margin: '0 auto',
    } as React.CSSProperties,
    bookedCard: {
      backgroundColor: '#ffffff',
      borderRadius: '20px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
      padding: '28px 20px',
      textAlign: 'center' as const,
    } as React.CSSProperties,
    statusPill: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      backgroundColor: '#dbeafe', // blue-100
      color: '#1d4ed8', // blue-700
      fontSize: '12px',
      fontWeight: 700,
      padding: '4px 12px',
      borderRadius: '20px',
      marginBottom: '16px',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.04em',
    } as React.CSSProperties,
    tokenBox: {
      backgroundColor: '#f8fafc',
      borderRadius: '16px',
      padding: '16px',
      margin: '16px 0',
      border: '1.5px dashed #cbd5e1',
    } as React.CSSProperties,
    tokenBig: {
      fontSize: '52px',
      fontWeight: 800,
      color: '#2563eb', // App Primary Indigo
      lineHeight: 1,
      marginTop: '4px',
      letterSpacing: '-0.03em',
    } as React.CSSProperties,
    detailsTable: {
      width: '100%',
      marginTop: '16px',
      borderTop: '1px solid #f1f5f9',
      textAlign: 'left' as const,
    } as React.CSSProperties,
    tableRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 0',
      borderBottom: '1px solid #f8fafc',
      fontSize: '14px',
    } as React.CSSProperties,
    spinner: {
      width: '32px',
      height: '32px',
      border: '3px solid #e2e8f0',
      borderTopColor: '#2563eb',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    } as React.CSSProperties,
    loadingPage: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      backgroundColor: '#f8fafc',
    } as React.CSSProperties,
  };

  // ─── Loading State ──────────────────────────────────────
  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={styles.spinner}></div>
        <div style={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>{t.loading}</div>
      </div>
    );
  }

  // ─── Error State ────────────────────────────────────────
  if (error) {
    return (
      <div style={styles.loadingPage}>
        <div style={{ fontSize: '40px' }}>🏥</div>
        <div style={{ color: '#ef4444', fontSize: '14px', maxWidth: '280px', textAlign: 'center', fontWeight: 500 }}>
          {error}
        </div>
      </div>
    );
  }

  // ─── Active Booking / Confirmed Screen ───────────────────
  if (booked) {
    return (
      <div style={styles.page}>
        {/* Header with App theme & Language Selector */}
        <div style={styles.header}>
          <div style={styles.headerTopRow}>
            <div style={styles.brandBadge}>🏥 MyQCare</div>
            <div style={styles.langPillContainer}>
              <button style={styles.langBtn(currentLang === 'hi')} onClick={() => changeLanguage('hi')}>हिन्दी</button>
              <button style={styles.langBtn(currentLang === 'mr')} onClick={() => changeLanguage('mr')}>मराठी</button>
              <button style={styles.langBtn(currentLang === 'en')} onClick={() => changeLanguage('en')}>EN</button>
            </div>
          </div>
          <h1 style={styles.headerTitle}>{alreadyBooked ? t.alreadyTitle : t.successTitle}</h1>
          <p style={styles.headerSub}>{t.alreadyMsg}</p>
        </div>

        {/* Content Card */}
        <div style={styles.bookedContainer}>
          <div style={styles.bookedCard}>
            <div style={styles.statusPill}>
              <span>●</span> {t.statusPending}
            </div>

            <div style={styles.tokenBox}>
              <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t.successToken}
              </div>
              <div style={styles.tokenBig}>#{tokenNumber}</div>
            </div>

            {/* Details Table */}
            <div style={styles.detailsTable}>
              {patientName && (
                <div style={styles.tableRow}>
                  <span style={{ color: '#64748b' }}>{t.patientName}</span>
                  <strong style={{ color: '#0f172a' }}>{patientName}</strong>
                </div>
              )}
              {doctorName && (
                <div style={styles.tableRow}>
                  <span style={{ color: '#64748b' }}>{t.successDoctor}</span>
                  <strong style={{ color: '#0f172a' }}>{doctorName}</strong>
                </div>
              )}
              {sessionName && (
                <div style={styles.tableRow}>
                  <span style={{ color: '#64748b' }}>{t.alreadySession}</span>
                  <span style={{ color: '#2563eb', fontWeight: 600 }}>{sessionName}</span>
                </div>
              )}
              {currentRunningToken > 0 && (
                <div style={styles.tableRow}>
                  <span style={{ color: '#64748b' }}>{t.alreadyRunningToken}</span>
                  <strong style={{ color: '#059669' }}>#{currentRunningToken}</strong>
                </div>
              )}
            </div>

            <p style={{ color: '#64748b', fontSize: '13px', marginTop: '18px', lineHeight: 1.5 }}>
              {t.successWait}
            </p>

            {/* Cancel Appointment Button */}
            <button
              onClick={handleCancelBooking}
              disabled={cancelling}
              style={styles.cancelBtn}
            >
              {cancelling ? t.cancellingBtn : t.cancelBtn}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Booking Form ──────────────────────────────────
  return (
    <div style={styles.page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      
      {/* Header with App Theme & Language Selector */}
      <div style={styles.header}>
        <div style={styles.headerTopRow}>
          <div style={styles.brandBadge}>🏥 MyQCare</div>
          
          {/* Language Switcher Pill */}
          <div style={styles.langPillContainer}>
            <button style={styles.langBtn(currentLang === 'hi')} onClick={() => changeLanguage('hi')}>हिन्दी</button>
            <button style={styles.langBtn(currentLang === 'mr')} onClick={() => changeLanguage('mr')}>मराठी</button>
            <button style={styles.langBtn(currentLang === 'en')} onClick={() => changeLanguage('en')}>EN</button>
          </div>
        </div>

        <h1 style={styles.headerTitle}>{t.title}</h1>
        <p style={styles.headerSub}>{patientName ? `👤 ${patientName} • ${t.subtitle}` : t.subtitle}</p>
      </div>

      {/* Body */}
      <div style={styles.body}>
        <div style={styles.label}>
          <span>🩺</span> {t.selectLabel}
        </div>

        {queues.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', padding: '30px 0' }}>
            {t.noSessions}
          </div>
        ) : (
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
                  <div style={styles.doctorIcon}>👨‍⚕️</div>
                  <div>
                    <div style={styles.doctorName}>{q.doctorName || 'Doctor'}</div>
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
        )}

        <button
          onClick={handleBook}
          disabled={booking || !selectedQueue}
          style={styles.primaryBtn(booking || !selectedQueue)}
        >
          {booking ? (
            <>
              <div style={{ ...styles.spinner, width: '18px', height: '18px', borderWidth: '2px', borderTopColor: '#fff' }}></div>
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
