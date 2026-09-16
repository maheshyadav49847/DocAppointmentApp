import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Stethoscope,
  Clock,
  IndianRupee,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Check,
  Image,
  Upload,
  Trash2,
  LogOut,
  User,
  Mail,
  Phone,
  Users,
  GraduationCap,
  Briefcase,
  Lock,
  Send,
  Plug,
  AlertCircle,
  Activity,
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import PhoneInput from '@/components/PhoneInput';
import { BrandLogo } from '@/components/BrandLogo';
import { FieldError } from '@/components/ui/FieldError';
import { useAuthStore } from '@/store/authStore';
import { onboardingService, type CompleteOnboardingSetupCommand } from '@/services/onboardingService';
import { branchService } from '@/services/branchService';
import { PageLoader } from '@/components/ui/PageLoader';

export default function OnboardingWizardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, clearAuth } = useAuthStore();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  const clearError = (field: string) => {
    setValidationErrors((prev) => {
      const fieldLower = field.toLowerCase();
      const keysToDelete = Object.keys(prev).filter((k) => k.toLowerCase() === fieldLower);
      if (keysToDelete.length === 0) return prev;
      const next = { ...prev };
      keysToDelete.forEach((k) => delete next[k]);
      return next;
    });
  };

  // Form State
  // Step 1: Branch
  const [branchName, setBranchName] = useState('');
  const [branchLogoBase64, setBranchLogoBase64] = useState<string>('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchWhatsAppDialCode, setBranchWhatsAppDialCode] = useState<string>('+91');
  const [branchWhatsApp, setBranchWhatsApp] = useState('');

  // Telegram Integration State
  const [enableTelegram, setEnableTelegram] = useState(false);
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [isTelegramVerified, setIsTelegramVerified] = useState(false);
  const [telegramBotInfo, setTelegramBotInfo] = useState<any>(null);
  const [telegramTesting, setTelegramTesting] = useState(false);
  const [telegramError, setTelegramError] = useState<string | null>(null);

  // Step 2: Doctor
  const [isOrgAdminDoctor, setIsOrgAdminDoctor] = useState(true);
  const [doctorName, setDoctorName] = useState('');
  const [doctorSpecialization, setDoctorSpecialization] = useState('');
  const [doctorRegNo, setDoctorRegNo] = useState('');
  const [doctorGender, setDoctorGender] = useState('Male');
  const [doctorExperience, setDoctorExperience] = useState('');
  const [doctorQualification, setDoctorQualification] = useState('');
  const [doctorPhoneDialCode, setDoctorPhoneDialCode] = useState<string>('+91');
  const [doctorPhone, setDoctorPhone] = useState('');
  const [doctorEmail, setDoctorEmail] = useState('');
  const [doctorDuration] = useState<number>(15);

  // Step 3: OPD Session
  const [sessionName, setSessionName] = useState('');
  const [isDaily, setIsDaily] = useState(true);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [capacity, setCapacity] = useState<number | ''>('');

  // Step 4: Consultation Fee & Rate List
  const [serviceName, setServiceName] = useState('');
  const [serviceFee, setServiceFee] = useState<number | ''>('');

  // Fetch Onboarding Status & Admin Info
  const { data: status, isLoading } = useQuery({
    queryKey: ['onboarding-status'],
    queryFn: onboardingService.getStatus,
    staleTime: 60 * 1000
  });

  // Pre-fill Details from Database Tables (Staff, Branches, Doctors, Sessions, ServiceItems)
  useEffect(() => {
    if (status) {
      // 1. Staff Table Details (Logged-in OrgAdmin)
      if (status.orgAdminName) {
        setDoctorName(prev => prev || status.orgAdminName);
      }
      if (status.orgAdminEmail) {
        setDoctorEmail(prev => prev || status.orgAdminEmail);
      }
      if (status.orgAdminPhone) {
        setDoctorPhone(prev => prev || status.orgAdminPhone);
        setBranchWhatsApp(prev => prev || status.orgAdminPhone);
      }
      if (status.orgAdminPhoneDialCode) {
        setDoctorPhoneDialCode(status.orgAdminPhoneDialCode);
        setBranchWhatsAppDialCode(status.orgAdminPhoneDialCode);
      }

      // 2. Branches Table Details (if already existing in DB)
      if (status.existingBranchName) {
        setBranchName(prev => prev || status.existingBranchName || '');
      }
      if (status.existingBranchAddress) {
        setBranchAddress(prev => prev || status.existingBranchAddress || '');
      }
      if (status.existingBranchPhone) {
        setBranchWhatsApp(status.existingBranchPhone);
      }
      if (status.existingBranchPhoneDialCode) {
        setBranchWhatsAppDialCode(status.existingBranchPhoneDialCode);
      }
      if (status.existingBranchLogoBase64) {
        setBranchLogoBase64(prev => prev || status.existingBranchLogoBase64 || '');
      }
      if (status.existingTelegramBotToken) {
        setEnableTelegram(true);
        setTelegramBotToken(status.existingTelegramBotToken);
        setIsTelegramVerified(true);
      }

      // 3. Doctors Table Details (if already existing in DB)
      if (status.existingDoctorSpecialization) {
        setDoctorSpecialization(prev => prev || status.existingDoctorSpecialization || '');
      }
      if (status.existingDoctorQualification) {
        setDoctorQualification(prev => prev || status.existingDoctorQualification || '');
      }
      if (status.existingDoctorExperience) {
        setDoctorExperience(prev => prev || status.existingDoctorExperience || '');
      }
      if (status.existingDoctorGender) {
        setDoctorGender(prev => prev || status.existingDoctorGender || 'Male');
      }
      if (status.existingDoctorRegNo) {
        setDoctorRegNo(prev => prev || status.existingDoctorRegNo || '');
      }

      // 4. Sessions Table Details (if already existing in DB)
      if (status.existingSessionName) {
        setSessionName(prev => prev || status.existingSessionName || '');
      }
      if (status.existingSessionStartTime) {
        setStartTime(prev => prev || status.existingSessionStartTime || '');
      }
      if (status.existingSessionEndTime) {
        setEndTime(prev => prev || status.existingSessionEndTime || '');
      }
      if (status.existingSessionCapacity) {
        setCapacity(prev => prev || status.existingSessionCapacity || '');
      }
      if (status.existingSessionIsDaily !== undefined && status.existingSessionIsDaily !== null) {
        setIsDaily(status.existingSessionIsDaily);
      }

      // 5. ServiceItems Table Details (if already existing in DB)
      if (status.existingServiceName) {
        setServiceName(prev => prev || status.existingServiceName || '');
      }
      if (status.existingServiceFee) {
        setServiceFee(prev => prev || status.existingServiceFee || '');
      }

      if (status.currentStep && status.currentStep > 1) {
        setCurrentStep(status.currentStep);
      }
    }
  }, [status]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTestTelegram = async () => {
    const trimmed = telegramBotToken.trim();
    if (!trimmed) {
      setTelegramError('Please enter a Telegram Bot Token to test.');
      return;
    }
    setTelegramTesting(true);
    setTelegramError(null);
    try {
      const res = await branchService.testTelegramConnection(trimmed);
      if (res && res.success) {
        setIsTelegramVerified(true);
        setTelegramBotInfo(res);
        clearError('TelegramBotToken');
        toast.success(`Connected to bot: @${res.bot?.result?.username || res.bot?.result?.first_name || 'Bot'}`);
      } else {
        setIsTelegramVerified(false);
        setTelegramError('Failed to connect. Please verify your bot token.');
      }
    } catch (err: any) {
      setIsTelegramVerified(false);
      const errMsg = err?.response?.data?.message || err?.response?.data || err?.message || 'Invalid Telegram Bot Token or connection error.';
      setTelegramError(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
      toast.error('Telegram bot test failed.');
    } finally {
      setTelegramTesting(false);
    }
  };

  const setupMutation = useMutation({
    mutationFn: (payload: CompleteOnboardingSetupCommand) => onboardingService.completeSetup(payload),
    onSuccess: (data) => {
      if (data?.branchId) {
        useAuthStore.getState().setActiveBranchId(data.branchId);

        // If telegram bot token configured, set webhook in background
        if (enableTelegram && telegramBotToken.trim()) {
          try {
            const apiPath = import.meta.env.VITE_API_URL || '/api/v1.0';
            const webhookUrl = apiPath.startsWith('http')
              ? `${apiPath}/telegram/webhook/${data.branchId}`
              : `${window.location.origin}${apiPath}/telegram/webhook/${data.branchId}`;
            branchService.setTelegramWebhook(telegramBotToken.trim(), webhookUrl).catch(console.warn);
          } catch (e) {
            console.warn('Webhook registration non-critical error:', e);
          }
        }
      }
      toast.success(data.message || '🎉 Clinic setup completed successfully!');
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      queryClient.invalidateQueries({ queryKey: ['my-branches'] });
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });

      // Navigate to queue or doctor-desk
      if (isOrgAdminDoctor) {
        navigate('/doctor-desk', { replace: true });
      } else {
        navigate('/queue', { replace: true });
      }
    },
    onError: (err: any) => {
      if (err?.response?.data?.errors) {
        setValidationErrors(err.response.data.errors);
      }
      const msg = err?.response?.data?.message || err?.message || 'Failed to complete setup';
      toast.error(msg);
    }
  });

  if (isLoading) {
    return <PageLoader />;
  }

  const steps = [
    { number: 1, title: 'Branch Setup', desc: 'Clinic location & contact', icon: Building2 },
    { number: 2, title: 'Doctor Profile', desc: 'Consulting physician', icon: Stethoscope },
    { number: 3, title: 'OPD Schedule', desc: 'Hours & capacity', icon: Clock },
    { number: 4, title: 'Consultation Fee', desc: 'Default billing rate', icon: IndianRupee },
  ];

  // Validation per step
  const handleNext = () => {
    const errors: Record<string, string[]> = {};

    if (currentStep === 1) {
      if (!branchName.trim()) {
        errors.Name = ['Branch Name is required.'];
      }
      if (!branchLogoBase64.trim()) {
        errors.LogoBase64 = ['Clinic / Branch Logo is required.'];
      }
      if (!branchAddress.trim()) {
        errors.Address = ['Physical Address is required.'];
      }
      if (!branchWhatsApp.trim()) {
        errors.WhatsAppNumber = ['WhatsApp Number is required.'];
      } else if (branchWhatsApp.trim().length < 7) {
        errors.WhatsAppNumber = ['Please enter a valid WhatsApp number (at least 7 digits).'];
      }

      // Telegram verification constraint:
      // If user enabled Telegram, bot token is required AND must be tested successfully before proceeding.
      if (enableTelegram) {
        if (!telegramBotToken.trim()) {
          errors.TelegramBotToken = ['Please enter your Telegram Bot Token or disable the Telegram option.'];
        } else if (!isTelegramVerified) {
          errors.TelegramBotToken = ['Please test and verify your Telegram Bot Token by clicking "Test Bot" before proceeding to the next step.'];
        }
      }
    } else if (currentStep === 2) {
      if (!doctorName.trim()) {
        errors.DoctorName = ['Doctor Full Name is required.'];
      }
      if (!doctorSpecialization.trim()) {
        errors.Specialization = ['Doctor Specialization is required.'];
      }
      if (!doctorGender.trim()) {
        errors.Gender = ['Gender is required.'];
      }
      if (!doctorQualification.trim()) {
        errors.Qualification = ['Qualification is required.'];
      }
      if (!doctorExperience.trim()) {
        errors.Experience = ['Experience is required.'];
      }
      // MCI / Medical Registration Number is mandatory if tenant doctor is selected
      if (isOrgAdminDoctor && !doctorRegNo.trim()) {
        errors.RegistrationNumber = ['Medical Registration Number (MCI Number) is mandatory.'];
      }
      if (doctorPhone.trim() && doctorPhone.trim().length < 7) {
        errors.Mobile = ['Please enter a valid mobile number (at least 7 digits).'];
      }
      if (doctorEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(doctorEmail.trim())) {
        errors.EmailId = ['Please enter a valid email address.'];
      }
    } else if (currentStep === 3) {
      if (!sessionName.trim()) {
        errors.SessionName = ['OPD Session Name is required.'];
      }
      if (!capacity || capacity <= 0) {
        errors.Capacity = ['Maximum token capacity must be at least 1.'];
      }
      if (!startTime) {
        errors.StartTime = ['Start Time is required.'];
      }
      if (!endTime) {
        errors.EndTime = ['End Time is required.'];
      } else if (startTime && endTime && startTime >= endTime) {
        errors.EndTime = ['End Time must be after Start Time.'];
      }
      if (!isDaily && selectedDays.length === 0) {
        errors.DaysOfWeek = ['Please select at least one day for the OPD session.'];
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSubmit = () => {
    const errors: Record<string, string[]> = {};
    if (!serviceName.trim()) {
      errors.ServiceName = ['Service Name is required.'];
    }
    if (!serviceFee || serviceFee <= 0) {
      errors.Price = ['Consultation Fee must be greater than 0.'];
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});

    const payload: CompleteOnboardingSetupCommand = {
      branch: {
        name: branchName.trim(),
        address: branchAddress.trim(),
        phoneDialCode: branchWhatsAppDialCode,
        phone: branchWhatsApp.trim(),
        whatsAppDialCode: branchWhatsAppDialCode,
        whatsAppNumber: branchWhatsApp.trim(),
        telegramBotToken: enableTelegram && telegramBotToken.trim() ? telegramBotToken.trim() : undefined,
        logoBase64: branchLogoBase64 || undefined
      },
      doctor: {
        isOrgAdminDoctor,
        name: doctorName.trim(),
        specialization: doctorSpecialization.trim(),
        registrationNumber: doctorRegNo.trim() || undefined,
        gender: doctorGender.trim() || undefined,
        qualification: doctorQualification.trim() || undefined,
        experience: doctorExperience.trim() || undefined,
        consultationFee: Number(serviceFee),
        consultationDurationMinutes: Number(doctorDuration),
        mobileDialCode: doctorPhoneDialCode,
        mobile: doctorPhone.trim() || undefined,
        emailId: doctorEmail.trim() || undefined
      },
      session: {
        sessionName: sessionName.trim(),
        isDaily,
        dayOfWeek: selectedDays.length > 0 ? selectedDays[0] : 1,
        daysOfWeek: isDaily ? undefined : selectedDays,
        startTime: `${startTime}:00`,
        endTime: `${endTime}:00`,
        defaultCapacity: Number(capacity)
      },
      rateList: {
        serviceName: serviceName.trim(),
        category: 'Consultation',
        price: Number(serviceFee)
      }
    };

    setupMutation.mutate(payload);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Bar Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shrink-0 z-30 sticky top-0 shadow-sm">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <BrandLogo theme="light" size="md" showSubtitle={true} />
          <span className="hidden sm:inline-block text-xs font-bold text-slate-400 border-l border-slate-200 pl-3">
            Clinic Onboarding Setup
          </span>
        </div>

        {/* Right: Profile Button with Logout only */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 sm:gap-3 p-1.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all text-left group"
          >
            <div className="hidden sm:block text-right">
              <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">
                {status?.orgAdminName || user?.email?.split('@')[0] || 'Clinic Admin'}
              </p>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-tight mt-0.5">
                {user?.role || 'Org Admin'}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center font-black text-indigo-600 text-xs border border-indigo-200 shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              {(status?.orgAdminName?.charAt(0) || user?.email?.charAt(0) || 'A').toUpperCase()}
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {status?.orgAdminName || user?.email?.split('@')[0] || 'Clinic Admin'}
                </p>
                <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">{user?.email}</p>
                <div className="mt-1.5">
                  <span className="inline-block px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">
                    {user?.role || 'OrgAdmin'}
                  </span>
                </div>
              </div>
              <div className="p-1">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    clearAuth();
                    navigate('/login');
                    toast.success('Logged out successfully');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl w-full mx-auto space-y-6">
        
        {/* Page Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Clinic Onboarding Wizard</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Clinic <span className="text-indigo-600">Quick Setup</span>
          </h1>
          <p className="text-slate-500 font-medium text-sm sm:text-base max-w-lg mx-auto">
            Complete these 4 foundational pillars to launch your clinic workspace and start booking patients.
          </p>
        </div>

        {/* Stepper Navigation */}
        <div className="saas-card p-4 sm:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {steps.map((step) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.number;
              const isDone = currentStep > step.number;

              return (
                <div
                  key={step.number}
                  className={`flex items-center gap-3 p-2.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-indigo-50/80 border border-indigo-200'
                      : isDone
                      ? 'bg-emerald-50/60 border border-emerald-100'
                      : 'opacity-60'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm ${
                      isDone
                        ? 'bg-emerald-600 text-white'
                        : isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : <StepIcon className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-bold truncate ${isActive ? 'text-indigo-950' : 'text-slate-700'}`}>
                      {step.title}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate hidden sm:block">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Card Content */}
        <div className="saas-card p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {/* STEP 1: Branch Setup */}
            {currentStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                    <span>Step 1: Setup Your Clinic Branch</span>
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Enter the physical branch name and contact details where consultations happen.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Clinic / Branch Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={branchName}
                      onChange={(e) => {
                        setBranchName(e.target.value);
                        clearError('Name');
                      }}
                      placeholder="e.g. City Care Clinic (Main Branch)"
                      className={`saas-input ${validationErrors.Name ? '!border-red-500 !focus:border-red-500 !focus:ring-red-500/20' : ''}`}
                    />
                    <FieldError errors={validationErrors} field="Name" />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1">
                      <Image className="w-4 h-4 text-indigo-500" /> Clinic / Branch Logo <span className="text-rose-500">*</span>
                    </label>
                    <div className={`flex items-center gap-4 p-4 bg-slate-50 border rounded-xl transition-all ${
                      validationErrors.LogoBase64 
                        ? 'border-red-500 bg-rose-50/20 ring-1 ring-red-500/20' 
                        : 'border-slate-200'
                    }`}>
                      {branchLogoBase64 ? (
                        <div className="relative group w-16 h-16 rounded-xl border border-slate-200 bg-white p-1 overflow-hidden shadow-sm flex items-center justify-center shrink-0">
                          <img src={branchLogoBase64} alt="Clinic Logo" className="w-full h-full object-contain" />
                          <button
                            type="button"
                            onClick={() => setBranchLogoBase64('')}
                            className="absolute inset-0 bg-slate-900/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
                            title="Remove logo"
                          >
                            <Trash2 className="w-5 h-5 text-white" />
                          </button>
                        </div>
                      ) : (
                        <div className={`w-16 h-16 rounded-xl border-2 border-dashed flex flex-col items-center justify-center shrink-0 transition-colors ${
                          validationErrors.LogoBase64
                            ? 'border-rose-400 bg-rose-50/50 text-rose-400'
                            : 'border-slate-300 bg-white text-slate-400'
                        }`}>
                          <Image className={`w-6 h-6 ${validationErrors.LogoBase64 ? 'text-rose-400' : 'text-slate-300'}`} />
                          <span className={`text-[9px] font-semibold mt-0.5 ${validationErrors.LogoBase64 ? 'text-rose-500' : 'text-slate-400'}`}>Required</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <input
                          type="file"
                          id="branch-logo-input"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 2 * 1024 * 1024) {
                                toast.error('Logo file size must be less than 2MB');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setBranchLogoBase64(reader.result as string);
                                clearError('LogoBase64');
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                        />
                        <label
                          htmlFor="branch-logo-input"
                          className={`btn-secondary text-xs py-2 px-3 inline-flex items-center gap-2 cursor-pointer font-semibold ${
                            validationErrors.LogoBase64 ? 'border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100' : ''
                          }`}
                        >
                          <Upload className={`w-3.5 h-3.5 ${validationErrors.LogoBase64 ? 'text-rose-600' : 'text-indigo-600'}`} />
                          <span>{branchLogoBase64 ? 'Change Logo' : 'Upload Clinic Logo'}</span>
                        </label>
                        <p className="text-xs text-slate-400 mt-1.5 font-medium">
                          PNG, JPG or WebP up to 2MB. Displayed on prescription headers & patient receipts.
                        </p>
                      </div>
                    </div>
                    <FieldError errors={validationErrors} field="LogoBase64" />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Address & Location <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={branchAddress}
                      onChange={(e) => {
                        setBranchAddress(e.target.value);
                        clearError('Address');
                      }}
                      placeholder="e.g. 102, Healthcare Plaza, Near Metro Station, Sector 18"
                      className={`saas-input resize-none ${validationErrors.Address ? '!border-red-500 !focus:border-red-500 !focus:ring-red-500/20' : ''}`}
                    />
                    <FieldError errors={validationErrors} field="Address" />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      <span>WhatsApp Number (Primary Clinic Phone)</span> <span className="text-rose-500">*</span>
                    </label>
                    <PhoneInput
                      phone={branchWhatsApp}
                      dialCode={branchWhatsAppDialCode}
                      onChange={(p, dc) => {
                        setBranchWhatsApp(p);
                        setBranchWhatsAppDialCode(dc);
                        clearError('WhatsAppNumber');
                      }}
                      placeholder="e.g. 9876543210"
                      className={validationErrors.WhatsAppNumber ? '!border-red-500 !focus-within:border-red-500 !focus-within:ring-red-500/20' : ''}
                    />
                    <p className="text-xs text-slate-400 mt-1 font-medium">
                      This number serves as your clinic's primary phone number and is used for sending automated appointment notifications to patients via WhatsApp.
                    </p>
                    <FieldError errors={validationErrors} field="WhatsAppNumber" />
                  </div>

                  {/* Telegram Integration Option */}
                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                          <Send className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">Configure Telegram Bot (Optional)</p>
                          <p className="text-xs text-slate-500">Enable patient booking and appointment alerts via your Telegram Bot</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enableTelegram}
                          onChange={(e) => {
                            setEnableTelegram(e.target.checked);
                            if (!e.target.checked) {
                              setTelegramBotToken('');
                              setIsTelegramVerified(false);
                              setTelegramBotInfo(null);
                              setTelegramError(null);
                              clearError('TelegramBotToken');
                            }
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                      </label>
                    </div>

                    {enableTelegram && (
                      <div className="mt-3 p-4 rounded-xl bg-sky-50/60 border border-sky-200 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Telegram Bot Token <span className="text-rose-500">*</span>
                          </label>
                          <span className="text-[11px] text-slate-500">
                            Obtained from <strong className="text-slate-800">@BotFather</strong> on Telegram
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              value={telegramBotToken}
                              onChange={(e) => {
                                setTelegramBotToken(e.target.value);
                                setIsTelegramVerified(false);
                                setTelegramBotInfo(null);
                                setTelegramError(null);
                                clearError('TelegramBotToken');
                              }}
                              placeholder="e.g. 123456789:ABCdefGHIjklmnoPQRstuvWXYZ"
                              className={`saas-input font-mono text-xs pr-8 ${
                                validationErrors.TelegramBotToken ? '!border-red-500 !focus:border-red-500 !focus:ring-red-500/20' : ''
                              }`}
                            />
                            {isTelegramVerified && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-3 top-1/2 -translate-y-1/2" />
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={handleTestTelegram}
                            disabled={telegramTesting || !telegramBotToken.trim()}
                            className="btn-secondary text-xs py-2 px-4 whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-50 font-semibold"
                          >
                            {telegramTesting ? (
                              <>
                                <Activity className="w-3.5 h-3.5 animate-spin text-sky-600" />
                                <span>Verifying...</span>
                              </>
                            ) : (
                              <>
                                <Plug className="w-3.5 h-3.5 text-sky-600" />
                                <span>Test Bot</span>
                              </>
                            )}
                          </button>
                        </div>

                        <FieldError errors={validationErrors} field="TelegramBotToken" />

                        {telegramError && (
                          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            <span>{telegramError}</span>
                          </div>
                        )}

                        {isTelegramVerified && telegramBotInfo && (
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <div>
                                <span className="font-bold">Bot Verified: </span>
                                <span>{telegramBotInfo.bot?.result?.first_name} </span>
                                <span className="font-semibold text-emerald-700">(@{telegramBotInfo.bot?.result?.username})</span>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                              Connected
                            </span>
                          </div>
                        )}

                        {!isTelegramVerified && (
                          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>You must test and verify this Telegram bot before proceeding to Step 2.</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Doctor Profile */}
            {currentStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-indigo-600" />
                    <span>Step 2: Doctor Profile</span>
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Configure your primary consulting doctor for prescription writing and OPD queues.
                  </p>
                </div>

                {/* Are you a Doctor Prompt */}
                <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-3">
                  <label className="block text-sm font-bold text-slate-900">
                    Are you (the Clinic Owner/Admin) also a consulting doctor here?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setIsOrgAdminDoctor(true)}
                      className={`p-3 rounded-lg text-left border transition-all flex items-start gap-3 ${
                        isOrgAdminDoctor
                          ? 'bg-white border-indigo-600 shadow-sm ring-2 ring-indigo-500/20'
                          : 'bg-white/60 border-slate-200 hover:bg-white text-slate-600'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                        isOrgAdminDoctor ? 'bg-indigo-600 text-white' : 'border border-slate-300'
                      }`}>
                        {isOrgAdminDoctor && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Yes, I am a Doctor</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Link my admin account as doctor so I can consult patients directly.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsOrgAdminDoctor(false)}
                      className={`p-3 rounded-lg text-left border transition-all flex items-start gap-3 ${
                        !isOrgAdminDoctor
                          ? 'bg-white border-indigo-600 shadow-sm ring-2 ring-indigo-500/20'
                          : 'bg-white/60 border-slate-200 hover:bg-white text-slate-600'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                        !isOrgAdminDoctor ? 'bg-indigo-600 text-white' : 'border border-slate-300'
                      }`}>
                        {!isOrgAdminDoctor && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">No, I Manage the Clinic</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          I will register a consulting doctor profile.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Row 1: Doctor Name & Gender */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                          <User className="w-4 h-4 text-indigo-500" />
                          <span>Doctor Full Name</span> <span className="text-rose-500">*</span>
                        </label>
                        {isOrgAdminDoctor && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            <Lock className="w-3 h-3" /> Registered Account
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={doctorName}
                        readOnly={isOrgAdminDoctor}
                        onChange={(e) => {
                          if (!isOrgAdminDoctor) {
                            setDoctorName(e.target.value);
                            clearError('DoctorName');
                          }
                        }}
                        placeholder="e.g. Dr. Rajesh Sharma"
                        className={`saas-input ${
                          isOrgAdminDoctor 
                            ? '!bg-slate-100/80 !text-slate-600 !border-slate-200 cursor-not-allowed select-none font-semibold' 
                            : ''
                        } ${validationErrors.DoctorName ? '!border-red-500 !focus:border-red-500 !focus:ring-red-500/20' : ''}`}
                      />
                      <FieldError errors={validationErrors} field="DoctorName" />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-pink-500" />
                        <span>Gender</span> <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={doctorGender}
                        onChange={(e) => {
                          setDoctorGender(e.target.value);
                          clearError('Gender');
                        }}
                        className={`saas-input ${validationErrors.Gender ? '!border-red-500 !focus:border-red-500 !focus:ring-red-500/20' : ''}`}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                      <FieldError errors={validationErrors} field="Gender" />
                    </div>
                  </div>

                  {/* Row 2: Contact Info (Mobile & Email - Readonly if OrgAdmin) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                          <Phone className="w-4 h-4 text-emerald-500" />
                          <span>Mobile Number</span>
                        </label>
                        {isOrgAdminDoctor && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            <Lock className="w-3 h-3" /> View Only
                          </span>
                        )}
                      </div>
                      {isOrgAdminDoctor ? (
                        <div className="w-full flex items-center h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-100/80 text-slate-600 font-semibold text-sm cursor-not-allowed select-none">
                          <span className="text-slate-500 mr-2">{doctorPhoneDialCode}</span>
                          <span>{doctorPhone || 'Not provided'}</span>
                        </div>
                      ) : (
                        <PhoneInput
                          phone={doctorPhone}
                          dialCode={doctorPhoneDialCode}
                          onChange={(p, dc) => {
                            setDoctorPhone(p);
                            setDoctorPhoneDialCode(dc);
                            clearError('Mobile');
                          }}
                          placeholder="e.g. 9876543210"
                          className={validationErrors.Mobile ? '!border-red-500 !focus-within:border-red-500 !focus-within:ring-red-500/20' : ''}
                        />
                      )}
                      <FieldError errors={validationErrors} field="Mobile" />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                          <Mail className="w-4 h-4 text-rose-500" />
                          <span>Email Address</span>
                        </label>
                        {isOrgAdminDoctor && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            <Lock className="w-3 h-3" /> View Only
                          </span>
                        )}
                      </div>
                      <input
                        type="email"
                        value={doctorEmail}
                        readOnly={isOrgAdminDoctor}
                        onChange={(e) => {
                          if (!isOrgAdminDoctor) {
                            setDoctorEmail(e.target.value);
                            clearError('EmailId');
                          }
                        }}
                        placeholder="doctor@example.com"
                        className={`saas-input ${
                          isOrgAdminDoctor 
                            ? '!bg-slate-100/80 !text-slate-600 !border-slate-200 cursor-not-allowed select-none font-semibold' 
                            : ''
                        } ${validationErrors.EmailId ? '!border-red-500 !focus:border-red-500 !focus:ring-red-500/20' : ''}`}
                      />
                      <FieldError errors={validationErrors} field="EmailId" />
                    </div>
                  </div>

                  {/* Row 3: Qualification & Experience */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-purple-500" />
                        <span>Qualification</span> <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={doctorQualification}
                        onChange={(e) => {
                          setDoctorQualification(e.target.value);
                          clearError('Qualification');
                        }}
                        placeholder="e.g. MBBS, MD, MS"
                        className={`saas-input ${validationErrors.Qualification ? '!border-red-500 !focus:border-red-500 !focus:ring-red-500/20' : ''}`}
                      />
                      <FieldError errors={validationErrors} field="Qualification" />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4 text-amber-500" />
                        <span>Experience</span> <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={doctorExperience}
                        onChange={(e) => {
                          setDoctorExperience(e.target.value);
                          clearError('Experience');
                        }}
                        placeholder="e.g. 5 Years, 10+ Years"
                        className={`saas-input ${validationErrors.Experience ? '!border-red-500 !focus:border-red-500 !focus:ring-red-500/20' : ''}`}
                      />
                      <FieldError errors={validationErrors} field="Experience" />
                    </div>
                  </div>

                  {/* Row 4: Specialization & Medical Reg No */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Stethoscope className="w-4 h-4 text-indigo-500" />
                        <span>Specialization</span> <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={doctorSpecialization}
                        onChange={(e) => {
                          setDoctorSpecialization(e.target.value);
                          clearError('Specialization');
                        }}
                        placeholder="e.g. General Physician, Pediatrician"
                        className={`saas-input ${validationErrors.Specialization ? '!border-red-500 !focus:border-red-500 !focus:ring-red-500/20' : ''}`}
                      />
                      <FieldError errors={validationErrors} field="Specialization" />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        <span>Medical Registration / MCI Number</span> {isOrgAdminDoctor && <span className="text-rose-500">*</span>}
                      </label>
                      <input
                        type="text"
                        value={doctorRegNo}
                        onChange={(e) => {
                          setDoctorRegNo(e.target.value);
                          clearError('RegistrationNumber');
                        }}
                        placeholder="e.g. MCI-12345"
                        className={`saas-input ${validationErrors.RegistrationNumber ? '!border-red-500 !focus:border-red-500 !focus:ring-red-500/20' : ''}`}
                      />
                      <FieldError errors={validationErrors} field="RegistrationNumber" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: OPD Schedule */}
            {currentStep === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-600" />
                    <span>Step 3: Setup OPD Session Timings</span>
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Define the consultation hours and maximum token limit for this doctor.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Session Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={sessionName}
                      onChange={(e) => {
                        setSessionName(e.target.value);
                        clearError('SessionName');
                      }}
                      placeholder="e.g. Morning OPD or Evening Session"
                      className={`saas-input ${validationErrors.SessionName ? '!border-red-500 !focus:border-red-500 !focus:ring-red-500/20' : ''}`}
                    />
                    <FieldError errors={validationErrors} field="SessionName" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Start Time <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => {
                          setStartTime(e.target.value);
                          clearError('StartTime');
                          clearError('EndTime');
                        }}
                        className={`saas-input ${validationErrors.StartTime ? '!border-red-500 !focus:border-red-500 !focus:ring-red-500/20' : ''}`}
                      />
                      <FieldError errors={validationErrors} field="StartTime" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        End Time <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => {
                          setEndTime(e.target.value);
                          clearError('EndTime');
                        }}
                        className={`saas-input ${validationErrors.EndTime ? '!border-red-500 !focus:border-red-500 !focus:ring-red-500/20' : ''}`}
                      />
                      <FieldError errors={validationErrors} field="EndTime" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Maximum Token Capacity <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={capacity}
                        onChange={(e) => {
                          setCapacity(e.target.value === '' ? '' : Number(e.target.value));
                          clearError('Capacity');
                        }}
                        placeholder="e.g. 30"
                        className={`saas-input ${validationErrors.Capacity ? '!border-red-500 !focus:border-red-500 !focus:ring-red-500/20' : ''}`}
                      />
                      <FieldError errors={validationErrors} field="Capacity" />
                      <p className="text-xs text-slate-400 mt-1">Daily patient booking limit for this slot</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Schedule Availability <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setIsDaily(true);
                            clearError('DaysOfWeek');
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            isDaily
                              ? 'bg-indigo-50/80 border-indigo-600 text-indigo-900 ring-2 ring-indigo-500/20 shadow-sm'
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold">Every Day</span>
                            {isDaily && <Check className="w-4 h-4 text-indigo-600 stroke-[3]" />}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">Mon to Sun (All 7 days)</p>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsDaily(false);
                            if (selectedDays.length === 0) {
                              setSelectedDays([1, 2, 3, 4, 5, 6]);
                            }
                            clearError('DaysOfWeek');
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            !isDaily
                              ? 'bg-indigo-50/80 border-indigo-600 text-indigo-900 ring-2 ring-indigo-500/20 shadow-sm'
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold">Specific Days</span>
                            {!isDaily && <Check className="w-4 h-4 text-indigo-600 stroke-[3]" />}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">Select working days</p>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Day Picker when Specific Days is selected */}
                  {!isDaily && (
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Select Operating Days <span className="text-rose-500">*</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDays([1, 2, 3, 4, 5, 6]);
                              clearError('DaysOfWeek');
                            }}
                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                          >
                            Mon-Sat
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDays([1, 2, 3, 4, 5]);
                              clearError('DaysOfWeek');
                            }}
                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                          >
                            Mon-Fri
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDays([1, 2, 3, 4, 5, 6, 0]);
                              clearError('DaysOfWeek');
                            }}
                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                          >
                            All Days
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                        {[
                          { val: 1, label: 'Mon', full: 'Monday' },
                          { val: 2, label: 'Tue', full: 'Tuesday' },
                          { val: 3, label: 'Wed', full: 'Wednesday' },
                          { val: 4, label: 'Thu', full: 'Thursday' },
                          { val: 5, label: 'Fri', full: 'Friday' },
                          { val: 6, label: 'Sat', full: 'Saturday' },
                          { val: 0, label: 'Sun', full: 'Sunday' }
                        ].map((d) => {
                          const isSelected = selectedDays.includes(d.val);
                          return (
                            <button
                              key={d.val}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedDays(selectedDays.filter(day => day !== d.val));
                                } else {
                                  setSelectedDays([...selectedDays, d.val]);
                                  clearError('DaysOfWeek');
                                }
                              }}
                              className={`py-2 px-1 rounded-lg text-xs font-bold transition-all border text-center ${
                                isSelected
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-1 ring-indigo-600'
                                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100/60'
                              }`}
                              title={d.full}
                            >
                              <span>{d.label}</span>
                            </button>
                          );
                        })}
                      </div>
                      <FieldError errors={validationErrors} field="DaysOfWeek" />
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* STEP 4: Consultation Fee & Rate List */}
            {currentStep === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <IndianRupee className="w-5 h-5 text-indigo-600" />
                    <span>Step 4: Default Consultation Fee</span>
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Confirm the base rate item added to your billing catalog for automatic token invoicing.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Service Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={serviceName}
                        onChange={(e) => {
                          setServiceName(e.target.value);
                          clearError('ServiceName');
                        }}
                        placeholder="e.g. Doctor Consultation or General OPD"
                        className={`saas-input ${validationErrors.ServiceName ? '!border-red-500 !focus:border-red-500 !focus:ring-red-500/20' : ''}`}
                      />
                      <FieldError errors={validationErrors} field="ServiceName" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Fee Amount (₹) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                        <input
                          type="number"
                          value={serviceFee}
                          onChange={(e) => {
                            setServiceFee(e.target.value === '' ? '' : Number(e.target.value));
                            clearError('Price');
                          }}
                          placeholder="e.g. 300"
                          className={`saas-input pl-8 ${validationErrors.Price ? '!border-red-500 !focus:border-red-500 !focus:ring-red-500/20' : ''}`}
                        />
                      </div>
                      <FieldError errors={validationErrors} field="Price" />
                    </div>
                  </div>

                  {/* Summary Card */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 mt-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Setup Summary Review
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <p className="text-slate-400 font-medium">Branch</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {branchLogoBase64 && (
                            <img src={branchLogoBase64} alt="Logo" className="w-5 h-5 rounded object-contain bg-white border border-slate-200 shrink-0" />
                          )}
                          <p className="font-bold text-slate-800 truncate">{branchName || 'Not configured'}</p>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {branchWhatsApp ? `${branchWhatsAppDialCode} ${branchWhatsApp}` : 'No phone set'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium">Doctor</p>
                        <p className="font-bold text-slate-800 truncate mt-0.5">{doctorName || 'Not configured'}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                          {doctorSpecialization || 'Specialization'} • {doctorQualification || 'Qualification'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium">Schedule</p>
                        <p className="font-bold text-slate-800 truncate mt-0.5">
                          {startTime && endTime ? `${startTime} - ${endTime}` : 'Time not set'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {isDaily ? 'Daily' : `${selectedDays.length} Days/wk`} • {capacity || 0} slots
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium">Consultation Fee</p>
                        <p className="font-bold text-slate-800 mt-0.5">₹{serviceFee || 0}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{serviceName || 'Consultation'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="btn-secondary flex items-center gap-2"
                disabled={setupMutation.isPending}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : <div />}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="btn-primary flex items-center gap-2 ml-auto"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={setupMutation.isPending}
                className="btn-primary flex items-center gap-2 ml-auto !bg-indigo-600 hover:!bg-indigo-700 !text-white"
              >
                {setupMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Configuring Clinic...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Complete Setup & Launch Clinic</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
    </div>
  );
}
