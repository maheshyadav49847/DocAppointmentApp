import { useEffect, useState, useMemo } from 'react';
import { BrandLogo } from '@/components/BrandLogo';

// ─── Translations ───────────────────────────────────────────
const T: Record<string, Record<string, string>> = {
  hi: {
    title: 'अपॉइंटमेंट बुक करें',
    subtitle: 'अपने डॉक्टर व सत्र को चुनें और कन्फर्म करें',
    selectLabel: 'उपलब्ध डॉक्टर्स एवं सत्र',
    selectSessionPrompt: 'कृपया एक सत्र चुनें',
    currentToken: 'चल रहा टोकन',
    waiting: 'प्रतीक्षारत',
    confirmBtn: 'बुकिंग कन्फर्म करें',
    bookingBtn: 'बुक हो रहा है...',
    loading: 'उपलब्ध सत्र लोड हो रहे हैं...',
    noSessions: 'अभी कोई सक्रिय सत्र नहीं है। कृपया बाद में कोशिश करें।',
    invalidLink: 'अमान्य लिंक। ब्रांच ID उपलब्ध नहीं है।',
    selectAlert: 'कृपया किसी एक डॉक्टर का सत्र चुनें।',
    networkError: 'नेटवर्क त्रुटि। कृपया पुनः प्रयास करें।',
    bookingFailed: 'बुकिंग विफल रही। कृपया पुनः प्रयास करें।',
    successTitle: 'अपॉइंटमेंट कन्फर्म!',
    successToken: 'आपका टोकन नंबर',
    successDoctor: 'डॉक्टर',
    doctorSpecialization: 'विशेषज्ञता',
    doctorQualification: 'योग्यता',
    doctorRegNo: 'पंजीकरण संख्या',
    regNoShort: 'Reg. No.',
    patientName: 'मरीज़ का नाम',
    patientNameInputLabel: 'मरीज़ का पूरा नाम',
    patientNamePlaceholder: 'अपना या मरीज़ का नाम यहाँ लिखें...',
    patientNameRequired: 'कृपया मरीज़ का नाम दर्ज करें।',
    successWait: 'कृपया क्लिनिक पर आकर अपनी बारी का इंतज़ार करें।',
    alreadyTitle: 'आपकी बुकिंग पहले से मौजूद है!',
    alreadyMsg: 'आपका टोकन आज के लिए पहले ही बुक हो चुका है।',
    alreadyRunningToken: 'वर्तमान चल रहा टोकन',
    alreadySession: 'सत्र',
    session: 'सत्र',
    cancelBtn: 'अपॉइंटमेंट रद्द करें',
    cancellingBtn: 'रद्द हो रहा है...',
    cancelConfirm: 'क्या आप वाकई अपनी अपॉइंटमेंट रद्द (Cancel) करना चाहते हैं?',
    cancelSuccess: 'आपकी अपॉइंटमेंट रद्द कर दी गई है।',
    bookNewBtn: 'नई अपॉइंटमेंट बुक करें',
    closeBtn: '✕ विंडो बंद करें (Close)',
    newBookingHint: 'ℹ️ एक फॉर्म से एक ही बुकिंग संभव है। दोबारा बुकिंग के लिए टेलीग्राम बॉट पर "HI" लिखकर नया फॉर्म प्राप्त करें।',
    statusPending: 'कतार में है (Waiting)',
    branchBadge: 'क्लिनिक / ब्रांच',
    formExpiredTitle: 'यह फॉर्म समाप्त हो चुका है',
    formExpiredSub: 'इस फॉर्म का उपयोग पहले ही किया जा चुका है',
    formExpiredBadge: 'समाप्त (Expired)',
    formExpiredMsg: 'इस फॉर्म से पहले ही एक बुकिंग की जा चुकी है। एक फॉर्म केवल एक ही बुकिंग के लिए मान्य है।',
    formExpiredAction: 'दोबारा नई बुकिंग के लिए कृपया टेलीग्राम बॉट पर "HI" लिखकर भेजें और नया फॉर्म प्राप्त करें।',
    registeredPatient: 'पंजीकृत मरीज़',
    registeredPatientHint: 'आपका नाम पहले से पंजीकृत है',
  },
  mr: {
    title: 'अपॉइंटमेंट बुक करा',
    subtitle: 'आपले डॉक्टर आणि सत्र निवडा आणि कन्फर्म करा',
    selectLabel: 'उपलब्ध डॉक्टर्स आणि सत्र',
    selectSessionPrompt: 'कृपया एक सत्र निवडा',
    currentToken: 'चालू टोकन',
    waiting: 'प्रतीक्षेत',
    confirmBtn: 'बुकिंग कन्फर्म करा',
    bookingBtn: 'बुक होत आहे...',
    loading: 'उपलब्ध सत्र लोड होत आहेत...',
    noSessions: 'सध्या कोणतेही सक्रिय सत्र नाही. कृपया नंतर प्रयत्न करा.',
    invalidLink: 'अवैध लिंक. ब्रांच ID उपलब्ध नाही.',
    selectAlert: 'कृपया डॉक्टरांचे एक सत्र निवडा.',
    networkError: 'नेटवर्क त्रुटी. कृपया पुन्हा प्रयत्न करा.',
    bookingFailed: 'बुकिंग अयशस्वी. कृपया पुन्हा प्रयत्न करा.',
    successTitle: 'अपॉइंटमेंट कन्फर्म झाली!',
    successToken: 'तुमचा टोकन नंबर',
    successDoctor: 'डॉक्टर',
    doctorSpecialization: 'विशेषज्ञता',
    doctorQualification: 'पात्रता',
    doctorRegNo: 'नोंदणी क्रमांक',
    regNoShort: 'Reg. No.',
    patientName: 'रुग्णाचे नाव',
    patientNameInputLabel: 'रुग्णाचे पूर्ण नाव',
    patientNamePlaceholder: 'स्वतःचे किंवा रुग्णाचे नाव येथे लिहा...',
    patientNameRequired: 'कृपया रुग्णाचे नाव प्रविष्ट करा.',
    successWait: 'कृपया क्लिनिकमध्ये येऊन आपल्या पाळीची वाट पहा.',
    alreadyTitle: 'तुमची बुकिंग आधीच झाली आहे!',
    alreadyMsg: 'आजच्या दिवसासाठी तुमचा टोकन आधीच बुक केला गेला आहे.',
    alreadyRunningToken: 'सध्या चालू असलेला टोकन',
    alreadySession: 'सत्र',
    session: 'सत्र',
    cancelBtn: 'अपॉइंटमेंट रद्द करा',
    cancellingBtn: 'रद्द होत आहे...',
    cancelConfirm: 'तुम्हाला नक्की तुमची अपॉइंटमेंट रद्द करायची आहे का?',
    cancelSuccess: 'तुमची अपॉइंटमेंट रद्द झाली आहे.',
    bookNewBtn: 'नवीन अपॉइंटमेंट बुक करा',
    closeBtn: '✕ विंडो बंद करा (Close)',
    newBookingHint: 'ℹ️ एका फॉर्ममधून एकच बुकिंग शक्य आहे. पुन्हा बुकिंग करण्यासाठी टेलिग्राम बॉटवर "HI" पाठवून नवीन फॉर्म मिळवा.',
    statusPending: 'रांगेत आहे (Waiting)',
    branchBadge: 'क्लिनिक / शाखा',
    formExpiredTitle: 'हा फॉर्म कालबाह्य झाला आहे',
    formExpiredSub: 'हा फॉर्म आधीच वापरला गेला आहे',
    formExpiredBadge: 'कालबाह्य (Expired)',
    formExpiredMsg: 'या फॉर्ममधून आधीच एक बुकिंग केली गेली आहे. एका फॉर्ममधून फक्त एकदाच बुकिंग करता येते.',
    formExpiredAction: 'पुन्हा नवीन बुकिंग करण्यासाठी कृपया टेलिग्राम बॉटवर "HI" लिहून पाठवा आणि नवीन फॉर्म मिळवा.',
    registeredPatient: 'नोंदणीकृत रुग्ण',
    registeredPatientHint: 'तुमचे नाव आधीच नोंदणीकृत आहे',
  },
  en: {
    title: 'Book Appointment',
    subtitle: 'Select your doctor & session, then confirm',
    selectLabel: 'Available Doctors & Sessions',
    selectSessionPrompt: 'Please select a session',
    currentToken: 'Current Serving',
    waiting: 'Waiting',
    confirmBtn: 'Confirm Booking',
    bookingBtn: 'Booking...',
    loading: 'Loading available sessions...',
    noSessions: 'No active sessions right now. Please try later.',
    invalidLink: 'Invalid link. Branch ID is missing.',
    selectAlert: 'Please select a doctor session.',
    networkError: 'Network error. Please try again.',
    bookingFailed: 'Booking failed. Please try again.',
    successTitle: 'Appointment Confirmed!',
    successToken: 'Your Token Number',
    successDoctor: 'Doctor',
    doctorSpecialization: 'Specialization',
    doctorQualification: 'Qualification',
    doctorRegNo: 'Registration No.',
    regNoShort: 'Reg. No.',
    patientName: 'Patient Name',
    patientNameInputLabel: 'Patient Full Name',
    patientNamePlaceholder: 'Enter your or patient name here...',
    patientNameRequired: 'Please enter patient name.',
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
    closeBtn: '✕ Close Window',
    newBookingHint: 'ℹ️ This form is single-use. To book a new appointment, send "HI" on Telegram to receive a fresh form.',
    statusPending: 'In Queue (Waiting)',
    branchBadge: 'Clinic / Branch',
    formExpiredTitle: 'This Form Has Expired',
    formExpiredSub: 'This booking link has already been used',
    formExpiredBadge: 'Expired',
    formExpiredMsg: 'This form has already been used to make an appointment. Each booking form can only be used once.',
    formExpiredAction: 'To make a new booking, please send "HI" to the Telegram bot to get a fresh booking form.',
    registeredPatient: 'Registered Patient',
    registeredPatientHint: 'Your name is already registered',
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

interface QueueItem {
  id: string;
  doctorId: string;
  doctorName: string;
  specialization?: string;
  qualification?: string;
  registrationNumber?: string;
  sessionName?: string;
  sessionStart?: string;
  sessionEnd?: string;
  currentTokenNumber: number;
  waitingCount: number;
  completedCount?: number;
  branchName?: string;
  branchAddress?: string;
  branchPhone?: string;
  branchLogo?: string | null;
  orgName?: string | null;
}

interface DoctorGroup {
  doctorId: string;
  doctorName: string;
  specialization?: string;
  qualification?: string;
  registrationNumber?: string;
  queues: QueueItem[];
}

// ─── Component ──────────────────────────────────────────────
const TelegramBookingForm = () => {
  const [queues, setQueues] = useState<QueueItem[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [booked, setBooked] = useState(false);
  const [alreadyBooked, setAlreadyBooked] = useState(false);
  const [formExpired, setFormExpired] = useState(false);
  const [tokenNumber, setTokenNumber] = useState(0);
  const [doctorName, setDoctorName] = useState('');
  const [doctorSpecialization, setDoctorSpecialization] = useState('');
  const [doctorQualification, setDoctorQualification] = useState('');
  const [doctorRegNo, setDoctorRegNo] = useState('');
  const [patientName, setPatientName] = useState('');
  const [enteredName, setEnteredName] = useState('');
  const [isRegisteredPatient, setIsRegisteredPatient] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [currentRunningToken, setCurrentRunningToken] = useState(0);

  // Branch and Organization branding state
  const [branchInfo, setBranchInfo] = useState<{
    name: string;
    address?: string | null;
    phone?: string | null;
    logoBase64?: string | null;
    orgName?: string | null;
  }>({ name: '' });

  const searchParams = new URLSearchParams(window.location.search);
  const branchId = searchParams.get('branchId');
  const chatId = searchParams.get('chatId') || '';
  const formId = searchParams.get('formId') || '';

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
        const data: QueueItem[] = await queueRes.json();
        setQueues(data || []);
        if (data && data.length > 0) {
          // Extract branch metadata from the first queue item if available
          const first = data[0];
          if (first.branchName) {
            setBranchInfo({
              name: first.branchName,
              address: first.branchAddress,
              phone: first.branchPhone,
              logoBase64: first.branchLogo,
              orgName: first.orgName,
            });
          }
          // Default selection to first session
          setSelectedQueue(first.id);
        }
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

    // 2. Scenario Check: Check if user already has an active booking for today or if form is expired
    const checkActiveBookingAndLoadQueues = async () => {
      try {
        if (chatId) {
          const bookingCheckRes = await fetch(
            `${import.meta.env.VITE_API_URL}/queue/branch/${branchId}/active-booking?chatId=${encodeURIComponent(chatId)}&formId=${encodeURIComponent(formId)}`
          );
          if (bookingCheckRes.ok) {
            const checkData = await bookingCheckRes.json();
            if (checkData.patientName && checkData.patientName.trim() !== '' && checkData.patientName.toLowerCase() !== 'unknown') {
              const cleanName = checkData.patientName.trim();
              setPatientName(cleanName);
              setEnteredName(cleanName);
              setIsRegisteredPatient(true);
            }
            if (checkData.branchName) {
              setBranchInfo({
                name: checkData.branchName,
                address: checkData.branchAddress,
                phone: checkData.branchPhone,
                logoBase64: checkData.branchLogo,
                orgName: checkData.orgName,
              });
            }
            if (checkData.preferredLanguage) {
              const pLang = normalizeLang(checkData.preferredLanguage);
              setCurrentLang(pLang);
              localStorage.setItem('tg_booking_lang', pLang);
            }
            if (checkData.hasActiveBooking) {
              setTokenNumber(checkData.tokenNumber);
              setDoctorName(checkData.doctorName || '');
              setDoctorSpecialization(checkData.specialization || '');
              setDoctorQualification(checkData.qualification || '');
              setDoctorRegNo(checkData.registrationNumber || '');
              setSessionName(checkData.sessionName || '');
              setCurrentRunningToken(checkData.currentTokenNumber || 0);
              setAlreadyBooked(true);
              setBooked(true);
              setLoading(false);
              return; // Shows active booking details directly!
            }
            if (checkData.isFormExpired) {
              setFormExpired(true);
              setLoading(false);
              return; // Form has expired!
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
  }, [branchId, chatId, formId]);

  // Group queues by Doctor ID
  const doctorGroups = useMemo<DoctorGroup[]>(() => {
    const map = new Map<string, DoctorGroup>();
    for (const q of queues) {
      const dId = q.doctorId || 'unknown';
      if (!map.has(dId)) {
        map.set(dId, {
          doctorId: dId,
          doctorName: q.doctorName || 'Doctor',
          specialization: q.specialization || '',
          qualification: q.qualification || '',
          registrationNumber: q.registrationNumber || '',
          queues: [],
        });
      }
      map.get(dId)!.queues.push(q);
    }
    return Array.from(map.values());
  }, [queues]);

  // Find currently selected doctor ID based on selectedQueue
  const selectedDoctorId = useMemo(() => {
    const found = queues.find(q => q.id === selectedQueue);
    return found ? found.doctorId : '';
  }, [queues, selectedQueue]);

  const handleBook = async () => {
    const finalPatientName = (isRegisteredPatient ? (patientName || enteredName) : enteredName).trim();
    if (!finalPatientName) {
      alert(t.patientNameRequired);
      return;
    }
    if (!selectedQueue) {
      alert(t.selectAlert);
      return;
    }
    setBooking(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/queue/${selectedQueue}/book-anonymous?chatId=${encodeURIComponent(chatId)}&formId=${encodeURIComponent(formId)}&lang=${encodeURIComponent(currentLang)}&patientName=${encodeURIComponent(finalPatientName)}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      );
      if (res.ok) {
        const data = await res.json();
        setTokenNumber(data.tokenNumber);
        setDoctorName(data.doctorName || '');
        setDoctorSpecialization(data.specialization || '');
        setDoctorQualification(data.qualification || '');
        setDoctorRegNo(data.registrationNumber || '');
        if (data.patientName) {
          setPatientName(data.patientName);
        } else if (enteredName.trim()) {
          setPatientName(enteredName.trim());
        }
        if (data.alreadyBooked) {
          setAlreadyBooked(true);
        }
        setBooked(true);
      } else {
        const errData = await res.json().catch(() => null);
        if (errData?.message) {
          alert(errData.message);
        } else {
          alert(t.bookingFailed);
        }
      }
    } catch { 
      alert(t.networkError); 
    } finally {
      setBooking(false);
    }
  };

  const handleCloseApp = () => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg && typeof tg.close === 'function') {
      tg.close();
    } else {
      window.close();
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
        alert(`${t.cancelSuccess}\n\n${t.newBookingHint}`);
        setBooked(false);
        setAlreadyBooked(false);
        setFormExpired(true);
        handleCloseApp();
      } else {
        alert(t.bookingFailed);
      }
    } catch {
      alert(t.networkError);
    } finally {
      setCancelling(false);
    }
  };

  // ─── Application Theme Styles ──────────────────────────────────────────
  const styles = {
    page: {
      minHeight: '100vh',
      backgroundColor: '#f8fafc', // slate-50
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      color: '#0f172a', // slate-900
      padding: 0,
      margin: 0,
    } as React.CSSProperties,

    // Header section: clean, hospital-grade outlined professional style
    header: {
      backgroundColor: '#ffffff',
      padding: '20px 20px 20px',
      borderBottom: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
      position: 'relative' as const,
    } as React.CSSProperties,

    headerTopRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px',
    } as React.CSSProperties,

    // Brand container
    brandContainer: {
      display: 'inline-flex',
      alignItems: 'center',
    } as React.CSSProperties,

    // Branch info banner: Clean, elegant hospital badge card
    branchBanner: {
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      backgroundColor: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '16px',
      padding: '14px 16px',
      marginBottom: '18px',
      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
    } as React.CSSProperties,

    branchLogoImg: {
      width: '44px',
      height: '44px',
      borderRadius: '12px',
      objectFit: 'contain' as const,
      backgroundColor: '#ffffff',
      border: '1px solid #e2e8f0',
      padding: '4px',
      flexShrink: 0,
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
    } as React.CSSProperties,

    branchLogoFallback: {
      width: '44px',
      height: '44px',
      borderRadius: '12px',
      backgroundColor: '#eff6ff',
      border: '1px solid #dbeafe',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '22px',
      color: '#2563eb',
      flexShrink: 0,
    } as React.CSSProperties,

    branchDetails: {
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'center',
      minWidth: 0,
      flex: 1,
    } as React.CSSProperties,

    branchTitle: {
      fontSize: '15px',
      fontWeight: 700,
      color: '#0f172a',
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      letterSpacing: '-0.01em',
    } as React.CSSProperties,

    branchMetaRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      flexWrap: 'wrap' as const,
      marginTop: '4px',
    } as React.CSSProperties,

    branchMetaText: {
      fontSize: '12px',
      color: '#64748b',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      fontWeight: 500,
      lineHeight: 1.3,
    } as React.CSSProperties,

    langPillContainer: {
      display: 'inline-flex',
      backgroundColor: '#f1f5f9',
      borderRadius: '20px',
      padding: '3px',
      border: '1px solid #e2e8f0',
      gap: '2px',
    } as React.CSSProperties,

    langBtn: (active: boolean) => ({
      border: active ? '1px solid #cbd5e1' : '1px solid transparent',
      background: active ? '#ffffff' : 'transparent',
      color: active ? '#0f172a' : '#64748b',
      fontWeight: active ? 700 : 500,
      fontSize: '12px',
      padding: '4px 12px',
      borderRadius: '16px',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      boxShadow: active ? '0 1px 3px rgba(0, 0, 0, 0.06)' : 'none',
    } as React.CSSProperties),

    headerTitle: {
      color: '#0f172a',
      fontSize: '20px',
      fontWeight: 700,
      margin: 0,
      letterSpacing: '-0.02em',
      lineHeight: 1.25,
    } as React.CSSProperties,

    headerSub: {
      color: '#64748b',
      fontSize: '13px',
      marginTop: '4px',
      fontWeight: 500,
      lineHeight: 1.4,
    } as React.CSSProperties,

    body: {
      padding: '18px 16px 40px',
      maxWidth: '520px',
      margin: '0 auto',
    } as React.CSSProperties,

    nameInputContainer: {
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      padding: '16px',
      marginBottom: '16px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
    } as React.CSSProperties,

    nameInputLabel: {
      fontSize: '13px',
      fontWeight: 700,
      color: '#1e293b',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    } as React.CSSProperties,

    nameInputField: {
      width: '100%',
      padding: '12px 14px',
      borderRadius: '10px',
      border: '1.5px solid #cbd5e1',
      fontSize: '15px',
      color: '#0f172a',
      outline: 'none',
      boxSizing: 'border-box' as const,
      transition: 'border-color 0.15s ease',
    } as React.CSSProperties,

    sectionLabel: {
      fontSize: '13px',
      fontWeight: 700,
      color: '#64748b', // slate-500
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    } as React.CSSProperties,

    // Doctor card grouping all sessions
    doctorCard: (isDoctorSelected: boolean) => ({
      borderRadius: '16px',
      border: isDoctorSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
      backgroundColor: '#ffffff',
      boxShadow: isDoctorSelected ? '0 6px 20px -4px rgba(79, 70, 229, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.04)',
      overflow: 'hidden',
      transition: 'all 0.15s ease',
      marginBottom: '14px',
    } as React.CSSProperties),

    doctorHeader: (isDoctorSelected: boolean) => ({
      padding: '14px 16px',
      backgroundColor: isDoctorSelected ? '#f5f3ff' : '#ffffff', // subtle indigo tint if selected
      borderBottom: '1px solid #f1f5f9',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    } as React.CSSProperties),

    doctorAvatar: {
      width: '42px',
      height: '42px',
      borderRadius: '12px',
      backgroundColor: '#e0e7ff', // indigo-100
      color: '#4f46e5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px',
      flexShrink: 0,
      fontWeight: 700,
    } as React.CSSProperties,

    doctorName: {
      fontWeight: 700,
      fontSize: '15px',
      color: '#0f172a',
      lineHeight: 1.25,
    } as React.CSSProperties,

    doctorSpecialty: {
      fontSize: '12px',
      color: '#4f46e5', // indigo-600
      marginTop: '2px',
      fontWeight: 600,
    } as React.CSSProperties,

    doctorSubRow: {
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap' as const,
      gap: '6px',
      marginTop: '3px',
    } as React.CSSProperties,

    doctorQualBadge: {
      fontSize: '11px',
      fontWeight: 600,
      color: '#0369a1', // sky-700
      backgroundColor: '#e0f2fe', // sky-100
      border: '1px solid #bae6fd',
      padding: '1px 7px',
      borderRadius: '6px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '3px',
    } as React.CSSProperties,

    doctorRegBadge: {
      fontSize: '11px',
      fontWeight: 600,
      color: '#475569', // slate-600
      backgroundColor: '#f1f5f9', // slate-100
      border: '1px solid #e2e8f0',
      padding: '1px 7px',
      borderRadius: '6px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '3px',
    } as React.CSSProperties,

    // Session list inside doctor card
    sessionList: {
      padding: '8px 12px 12px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '8px',
    } as React.CSSProperties,

    // Individual session radio row
    sessionRow: (isSelected: boolean) => ({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 14px',
      borderRadius: '12px',
      border: isSelected ? '1.5px solid #4f46e5' : '1px solid #f1f5f9',
      backgroundColor: isSelected ? '#eff6ff' : '#f8fafc',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    } as React.CSSProperties),

    radioOuter: (isSelected: boolean) => ({
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      border: isSelected ? '6px solid #4f46e5' : '2px solid #cbd5e1',
      backgroundColor: '#ffffff',
      flexShrink: 0,
      marginRight: '12px',
      transition: 'all 0.15s ease',
      boxSizing: 'border-box' as const,
    } as React.CSSProperties),

    sessionInfo: {
      display: 'flex',
      flexDirection: 'column' as const,
      flex: 1,
    } as React.CSSProperties,

    sessionNameText: {
      fontSize: '13px',
      fontWeight: 700,
      color: '#1e293b',
    } as React.CSSProperties,

    sessionTiming: {
      fontSize: '12px',
      color: '#64748b',
      marginTop: '1px',
    } as React.CSSProperties,

    sessionStats: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      flexShrink: 0,
    } as React.CSSProperties,

    statPill: {
      fontSize: '11px',
      padding: '3px 8px',
      borderRadius: '8px',
      backgroundColor: '#ffffff',
      border: '1px solid #e2e8f0',
      color: '#475569',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontWeight: 500,
    } as React.CSSProperties,

    primaryBtn: (disabled: boolean) => ({
      marginTop: '16px',
      width: '100%',
      padding: '14px',
      backgroundColor: disabled ? '#94a3b8' : '#4f46e5', // App Primary Indigo
      color: '#ffffff',
      border: 'none',
      borderRadius: '14px',
      fontSize: '15px',
      fontWeight: 700,
      cursor: disabled ? 'not-allowed' : 'pointer',
      boxShadow: disabled ? 'none' : '0 6px 16px rgba(79, 70, 229, 0.35)',
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

    closeBtn: {
      marginTop: '10px',
      width: '100%',
      padding: '12px',
      backgroundColor: '#f8fafc',
      color: '#475569',
      border: '1px solid #cbd5e1',
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

    newBookingHintBox: {
      marginTop: '14px',
      padding: '10px 12px',
      backgroundColor: '#f0fdf4',
      border: '1px solid #bbf7d0',
      borderRadius: '10px',
      color: '#166534',
      fontSize: '12px',
      lineHeight: 1.45,
      textAlign: 'center' as const,
      fontWeight: 500,
    } as React.CSSProperties,

    // Active Booking Page styles
    bookedContainer: {
      padding: '24px 16px',
      maxWidth: '480px',
      margin: '0 auto',
    } as React.CSSProperties,

    bookedCard: {
      backgroundColor: '#ffffff',
      borderRadius: '20px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 6px 24px rgba(0, 0, 0, 0.06)',
      padding: '28px 20px',
      textAlign: 'center' as const,
    } as React.CSSProperties,

    statusPill: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      backgroundColor: '#e0e7ff', // indigo-100
      color: '#4338ca', // indigo-700
      fontSize: '12px',
      fontWeight: 700,
      padding: '4px 14px',
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
      fontSize: '54px',
      fontWeight: 800,
      color: '#4f46e5', // Primary Indigo
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
      borderTopColor: '#4f46e5',
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

  // ─── Form Expired Screen ─────────────────────────────────
  if (formExpired) {
    return (
      <div style={styles.page}>
        {/* Header with App Theme, BrandLogo, Branch Info & Language Switcher */}
        <div style={styles.header}>
          <div style={styles.headerTopRow}>
            {/* MyQCare Official Brand Logo */}
            <div style={styles.brandContainer}>
              <BrandLogo theme="light" size="sm" showSubtitle={false} />
            </div>

            {/* Language Switcher Pill */}
            <div style={styles.langPillContainer}>
              <button style={styles.langBtn(currentLang === 'hi')} onClick={() => changeLanguage('hi')}>हिन्दी</button>
              <button style={styles.langBtn(currentLang === 'mr')} onClick={() => changeLanguage('mr')}>मराठी</button>
              <button style={styles.langBtn(currentLang === 'en')} onClick={() => changeLanguage('en')}>EN</button>
            </div>
          </div>

          {/* Branch / Hospital Name, Logo/Icon, Address & Mobile */}
          {branchInfo.name && (
            <div style={styles.branchBanner}>
              {branchInfo.logoBase64 ? (
                <img
                  src={branchInfo.logoBase64.startsWith('data:') ? branchInfo.logoBase64 : `data:image/png;base64,${branchInfo.logoBase64}`}
                  alt="Branch Logo"
                  style={styles.branchLogoImg}
                />
              ) : (
                <div style={styles.branchLogoFallback}>🏥</div>
              )}
              <div style={styles.branchDetails}>
                <span style={styles.branchTitle}>{branchInfo.name}</span>
                {(branchInfo.address || branchInfo.phone) && (
                  <div style={styles.branchMetaRow}>
                    {branchInfo.address && (
                      <span style={styles.branchMetaText} title={branchInfo.address}>
                        📍 {branchInfo.address}
                      </span>
                    )}
                    {branchInfo.phone && (
                      <span style={styles.branchMetaText}>
                        📞 {branchInfo.phone}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <h1 style={styles.headerTitle}>{t.formExpiredTitle}</h1>
          <p style={styles.headerSub}>{t.formExpiredSub}</p>
        </div>

        {/* Content Card */}
        <div style={styles.bookedContainer}>
          <div style={styles.bookedCard}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#fef2f2',
              border: '2px solid #fecaca',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '30px',
              margin: '0 auto 16px auto',
            }}>
              ⏱️
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              fontSize: '12px',
              fontWeight: 700,
              padding: '4px 14px',
              borderRadius: '20px',
              marginBottom: '16px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              <span>●</span> {t.formExpiredBadge}
            </div>

            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>
              {t.formExpiredTitle}
            </h2>

            <p style={{ color: '#475569', fontSize: '14px', lineHeight: 1.6, margin: '0 0 18px 0' }}>
              {t.formExpiredMsg}
            </p>

            <div style={{
              padding: '12px 14px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              color: '#166534',
              fontSize: '13px',
              fontWeight: 600,
              lineHeight: 1.5,
              marginBottom: '22px',
              textAlign: 'center',
            }}>
              💬 {t.formExpiredAction}
            </div>

            {/* Close Window Button */}
            <button
              onClick={handleCloseApp}
              style={styles.closeBtn}
            >
              {t.closeBtn}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Active Booking / Confirmed Screen ───────────────────
  if (booked) {
    return (
      <div style={styles.page}>
        {/* Header with App Theme, BrandLogo, Branch Info & Language Switcher */}
        <div style={styles.header}>
          <div style={styles.headerTopRow}>
            {/* MyQCare Official Brand Logo */}
            <div style={styles.brandContainer}>
              <BrandLogo theme="light" size="sm" showSubtitle={false} />
            </div>

            {/* Language Switcher Pill */}
            <div style={styles.langPillContainer}>
              <button style={styles.langBtn(currentLang === 'hi')} onClick={() => changeLanguage('hi')}>हिन्दी</button>
              <button style={styles.langBtn(currentLang === 'mr')} onClick={() => changeLanguage('mr')}>मराठी</button>
              <button style={styles.langBtn(currentLang === 'en')} onClick={() => changeLanguage('en')}>EN</button>
            </div>
          </div>

          {/* Branch / Hospital Name, Logo/Icon, Address & Mobile */}
          {branchInfo.name && (
            <div style={styles.branchBanner}>
              {branchInfo.logoBase64 ? (
                <img
                  src={branchInfo.logoBase64.startsWith('data:') ? branchInfo.logoBase64 : `data:image/png;base64,${branchInfo.logoBase64}`}
                  alt="Branch Logo"
                  style={styles.branchLogoImg}
                />
              ) : (
                <div style={styles.branchLogoFallback}>🏥</div>
              )}
              <div style={styles.branchDetails}>
                <span style={styles.branchTitle}>{branchInfo.name}</span>
                {(branchInfo.address || branchInfo.phone) && (
                  <div style={styles.branchMetaRow}>
                    {branchInfo.address && (
                      <span style={styles.branchMetaText} title={branchInfo.address}>
                        📍 {branchInfo.address}
                      </span>
                    )}
                    {branchInfo.phone && (
                      <span style={styles.branchMetaText}>
                        📞 {branchInfo.phone}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

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
              {doctorSpecialization && (
                <div style={styles.tableRow}>
                  <span style={{ color: '#64748b' }}>{t.doctorSpecialization}</span>
                  <span style={{ color: '#4f46e5', fontWeight: 600 }}>{doctorSpecialization}</span>
                </div>
              )}
              {doctorQualification && (
                <div style={styles.tableRow}>
                  <span style={{ color: '#64748b' }}>{t.doctorQualification}</span>
                  <span style={{ color: '#0f172a', fontWeight: 600 }}>{doctorQualification}</span>
                </div>
              )}
              {doctorRegNo && (
                <div style={styles.tableRow}>
                  <span style={{ color: '#64748b' }}>{t.doctorRegNo}</span>
                  <span style={{ color: '#334155', fontWeight: 600, fontFamily: 'monospace' }}>{doctorRegNo}</span>
                </div>
              )}
              {sessionName && (
                <div style={styles.tableRow}>
                  <span style={{ color: '#64748b' }}>{t.alreadySession}</span>
                  <span style={{ color: '#4f46e5', fontWeight: 700 }}>{sessionName}</span>
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

            {/* Close Window Button */}
            <button
              onClick={handleCloseApp}
              style={styles.closeBtn}
            >
              {t.closeBtn}
            </button>

            {/* Single-form notice / hint */}
            <div style={styles.newBookingHintBox}>
              {t.newBookingHint}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Booking Form ──────────────────────────────────
  return (
    <div style={styles.page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      
      {/* Header with App Theme, BrandLogo, Branch Details & Language Selector */}
      <div style={styles.header}>
        <div style={styles.headerTopRow}>
          {/* Official MyQCare Brand Logo */}
          <div style={styles.brandContainer}>
            <BrandLogo theme="light" size="sm" showSubtitle={false} />
          </div>
          
          {/* Language Switcher Pill */}
          <div style={styles.langPillContainer}>
            <button style={styles.langBtn(currentLang === 'hi')} onClick={() => changeLanguage('hi')}>हिन्दी</button>
            <button style={styles.langBtn(currentLang === 'mr')} onClick={() => changeLanguage('mr')}>मराठी</button>
            <button style={styles.langBtn(currentLang === 'en')} onClick={() => changeLanguage('en')}>EN</button>
          </div>
        </div>

        {/* Branch / Hospital Name, Logo/Icon, Address & Mobile */}
        {branchInfo.name && (
          <div style={styles.branchBanner}>
            {branchInfo.logoBase64 ? (
              <img
                src={branchInfo.logoBase64.startsWith('data:') ? branchInfo.logoBase64 : `data:image/png;base64,${branchInfo.logoBase64}`}
                alt="Branch Logo"
                style={styles.branchLogoImg}
              />
            ) : (
              <div style={styles.branchLogoFallback}>🏥</div>
            )}
            <div style={styles.branchDetails}>
              <span style={styles.branchTitle}>{branchInfo.name}</span>
              {(branchInfo.address || branchInfo.phone) && (
                <div style={styles.branchMetaRow}>
                  {branchInfo.address && (
                    <span style={styles.branchMetaText} title={branchInfo.address}>
                      📍 {branchInfo.address}
                    </span>
                  )}
                  {branchInfo.phone && (
                    <span style={styles.branchMetaText}>
                      📞 {branchInfo.phone}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <h1 style={styles.headerTitle}>{t.title}</h1>
        <p style={styles.headerSub}>{patientName ? `👤 ${patientName} • ${t.subtitle}` : t.subtitle}</p>
      </div>

      {/* Body */}
      <div style={styles.body}>
        {/* Patient Name Section */}
        {isRegisteredPatient ? (
          <div style={styles.nameInputContainer}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ ...styles.nameInputLabel, marginBottom: 0 }}>
                <span>👤</span> {t.patientName}
              </label>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                color: '#059669',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                padding: '3px 10px',
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                🔒 {t.registeredPatient}
              </span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              backgroundColor: '#f8fafc',
              borderRadius: '14px',
              border: '1.5px solid #cbd5e1',
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#e0e7ff',
                color: '#4338ca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '800',
                fontSize: '15px',
                flexShrink: 0
              }}>
                {(patientName || enteredName).charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', lineHeight: 1.3 }}>
                  {patientName || enteredName}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500', marginTop: '2px' }}>
                  {t.registeredPatientHint}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={styles.nameInputContainer}>
            <label style={styles.nameInputLabel}>
              <span>👤</span> {t.patientNameInputLabel} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={enteredName}
              onChange={(e) => setEnteredName(e.target.value)}
              placeholder={t.patientNamePlaceholder}
              style={styles.nameInputField}
              maxLength={60}
            />
          </div>
        )}

        <div style={styles.sectionLabel}>
          <span>🩺</span> {t.selectLabel}
        </div>

        {doctorGroups.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', padding: '30px 0' }}>
            {t.noSessions}
          </div>
        ) : (
          <div>
            {doctorGroups.map(group => {
              const isDoctorActive = selectedDoctorId === group.doctorId;
              return (
                <div
                  key={group.doctorId}
                  style={styles.doctorCard(isDoctorActive)}
                >
                  {/* Doctor Info Header (Rendered once per doctor) */}
                  <div style={styles.doctorHeader(isDoctorActive)}>
                    <div style={styles.doctorAvatar}>👨‍⚕️</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={styles.doctorName}>{group.doctorName}</div>
                      <div style={styles.doctorSubRow}>
                        {group.specialization && (
                          <div style={styles.doctorSpecialty}>{group.specialization}</div>
                        )}
                        {group.qualification && (
                          <div style={styles.doctorQualBadge}>
                            <span>🎓</span> {group.qualification}
                          </div>
                        )}
                        {group.registrationNumber && (
                          <div style={styles.doctorRegBadge}>
                            <span>📋</span> {t.regNoShort}: {group.registrationNumber}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sessions under this Doctor (with Radio Buttons) */}
                  <div style={styles.sessionList}>
                    {group.queues.map(sessionQueue => {
                      const isSessionSelected = selectedQueue === sessionQueue.id;
                      return (
                        <div
                          key={sessionQueue.id}
                          onClick={() => setSelectedQueue(sessionQueue.id)}
                          style={styles.sessionRow(isSessionSelected)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                            {/* Radio Button Indicator */}
                            <div style={styles.radioOuter(isSessionSelected)} />

                            <div style={styles.sessionInfo}>
                              <span style={styles.sessionNameText}>
                                {sessionQueue.sessionName || `${t.session}`}
                              </span>
                              {sessionQueue.sessionStart && sessionQueue.sessionEnd && (
                                <span style={styles.sessionTiming}>
                                  🕒 {sessionQueue.sessionStart} - {sessionQueue.sessionEnd}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Session Live Queue Status */}
                          <div style={styles.sessionStats}>
                            <div style={styles.statPill} title={t.currentToken}>
                              <span>🎫</span>
                              <strong>#{sessionQueue.currentTokenNumber || 0}</strong>
                            </div>
                            <div style={styles.statPill} title={t.waiting}>
                              <span>⏳</span>
                              <span>{sessionQueue.waitingCount || 0}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
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
