import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import {
  Smartphone, CheckCircle2, KeyRound,
  Copy, Check, Activity, AlertCircle,
  SlidersHorizontal, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

declare const FB: any;

interface MetaEmbeddedSignupProps {
  branch: any;
  onSuccess: () => void;
}

export default function MetaEmbeddedSignup({ branch, onSuccess }: MetaEmbeddedSignupProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'embedded' | 'manual'>('embedded');
  const [isEditing, setIsEditing] = useState(false);

  // Manual credentials state
  const [wabaId, setWabaId] = useState(branch?.metaWabaId || '');
  const [phoneId, setPhoneId] = useState(branch?.metaPhoneNumberId || '');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [configId, setConfigId] = useState<string>('');
  const [sdkLoaded, setSdkLoaded] = useState(false);

  const isConnected = !!branch?.metaPhoneNumberId;

  useEffect(() => {
    // Fetch Meta Settings from backend (AppId and ConfigId)
    api.get('/meta/whatsapp/config').then(res => {
      const { appId, configId } = res.data;
      setConfigId(configId);

      if (appId && !document.getElementById('facebook-jssdk')) {
        (window as any).fbAsyncInit = function() {
          FB.init({
            appId      : appId,
            cookie     : true,
            xfbml      : true,
            version    : 'v19.0'
          });
          setSdkLoaded(true);
        };

        const js = document.createElement('script');
        js.id = 'facebook-jssdk';
        js.src = "https://connect.facebook.net/en_US/sdk.js";
        document.head.appendChild(js);
      } else if (typeof FB !== 'undefined') {
        setSdkLoaded(true);
      }
    }).catch(err => {
      console.error("Failed to load meta settings", err);
    });
  }, []);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const launchWhatsAppSignup = () => {
    setLoading(true);
    setError(null);

    if (!sdkLoaded || typeof FB === 'undefined') {
      setError('Facebook SDK is not loaded. Please ensure App ID is configured in system settings.');
      setLoading(false);
      return;
    }

    FB.login((response: any) => {
      if (response.authResponse) {
        api.post('/meta/whatsapp/save-credentials', {
          branchId: branch.id,
          wabaId: 'WABA_FROM_OAUTH', 
          phoneNumberId: 'PHONE_FROM_OAUTH'
        }).then(() => {
          toast.success("WhatsApp Business Account connected successfully!");
          onSuccess();
          setLoading(false);
        }).catch((err: any) => {
          setError(err.response?.data || err.message);
          setLoading(false);
        });

      } else {
        setError('Login was cancelled or blocked by Meta. If your app is still in testing mode, use Manual Setup below.');
        setLoading(false);
      }
    }, {
      config_id: configId,
      response_type: 'code',
      override_default_response_type: true,
      extras: {
        feature: 'whatsapp_embedded_signup',
        setup: {}
      }
    });
  };

  const saveManualCredentials = () => {
    if (!phoneId.trim()) {
      setError("Phone Number ID is required.");
      return;
    }
    
    setLoading(true);
    setError(null);
    api.post('/meta/whatsapp/save-credentials', {
      branchId: branch.id,
      wabaId: wabaId.trim() || 'MANUAL_WABA',
      phoneNumberId: phoneId.trim()
    }).then(() => {
      toast.success("Meta credentials saved successfully!");
      setIsEditing(false);
      onSuccess();
      setLoading(false);
    }).catch((err: any) => {
      setError(err.response?.data || err.message);
      setLoading(false);
    });
  };

  // If already connected and not currently editing credentials
  if (isConnected && !isEditing) {
    return (
      <div className="space-y-4">
        {/* Verified Connection Card */}
        <div className="bg-gradient-to-br from-emerald-50/50 via-white to-slate-50 border border-emerald-200 rounded-lg p-5 shadow-2xs space-y-4">
          <div className="flex items-start justify-between border-b border-emerald-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900">
                    Meta Cloud Account Active
                  </h4>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <Check className="w-3 h-3" /> Live
                  </span>
                </div>
                <p className="text-xs font-medium text-emerald-800 mt-0.5">
                  Connected Number: <strong className="text-slate-900 font-mono">{branch.whatsAppDialCode || ''} {branch.whatsAppNumber}</strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="btn-secondary py-1.5 px-3 text-xs font-semibold flex items-center gap-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Change Credentials</span>
            </button>
          </div>

          {/* Credential Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white border border-slate-200 rounded-md p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Phone Number ID
              </span>
              <div className="flex items-center justify-between font-mono text-xs text-slate-800">
                <span className="truncate">{branch.metaPhoneNumberId}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(branch.metaPhoneNumberId, 'phoneId')}
                  className="text-slate-400 hover:text-slate-600 p-1"
                  title="Copy Phone Number ID"
                >
                  {copiedField === 'phoneId' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-md p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                WABA Account ID
              </span>
              <div className="flex items-center justify-between font-mono text-xs text-slate-800">
                <span className="truncate">{branch.metaWabaId || 'Auto-Managed'}</span>
                {branch.metaWabaId && (
                  <button
                    type="button"
                    onClick={() => handleCopy(branch.metaWabaId, 'wabaId')}
                    className="text-slate-400 hover:text-slate-600 p-1"
                    title="Copy WABA ID"
                  >
                    {copiedField === 'wabaId' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-emerald-50/80 border border-emerald-100 rounded-md p-2.5 flex items-center gap-2 text-xs text-emerald-800 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Ready to dispatch appointment alerts, token updates, and accept patient bookings.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mode Switch Tabs */}
      <div className="flex border-b border-slate-200 gap-4 pb-2 text-xs font-semibold">
        <button
          type="button"
          onClick={() => { setMode('embedded'); setError(null); }}
          className={`pb-1 flex items-center gap-1.5 transition-colors border-b-2 -mb-2 ${
            mode === 'embedded'
              ? 'border-blue-600 text-blue-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Embedded Signup (Official Meta)</span>
        </button>
        <button
          type="button"
          onClick={() => { setMode('manual'); setError(null); }}
          className={`pb-1 flex items-center gap-1.5 transition-colors border-b-2 -mb-2 ${
            mode === 'manual'
              ? 'border-indigo-600 text-indigo-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Manual Credentials</span>
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-md flex items-start gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {mode === 'embedded' ? (
        <div className="bg-gradient-to-br from-blue-50/40 via-white to-slate-50 border border-blue-100 rounded-lg p-6 text-center space-y-4 shadow-2xs">
          <div className="w-14 h-14 bg-[#1877F2] text-white rounded-lg flex items-center justify-center mx-auto shadow-md shadow-blue-500/10">
            <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </div>

          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              One-Click Meta Embedded Signup
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Authenticate via Facebook to link your clinic&apos;s WhatsApp Business Account. Meta will issue the Phone Number ID and authorize your clinic bot automatically.
            </p>
          </div>

          <div className="pt-2 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={launchWhatsAppSignup}
              disabled={loading}
              className="bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold py-2.5 px-6 rounded-md text-xs shadow-xs transition-all flex items-center gap-2 disabled:opacity-70 active:translate-y-0"
            >
              {loading ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  <span>Connecting with Meta...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span>Continue with Facebook</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMode('manual')}
              className="text-[11px] text-slate-500 hover:text-indigo-600 transition-colors font-medium mt-1"
            >
              Or enter Meta Developer Phone Number ID manually →
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Direct Meta Developer Credentials
              </h4>
              <p className="text-[11px] text-slate-500">
                Paste your credentials from the Meta App Dashboard
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number ID <span className="text-rose-500">*</span>
              </label>
              <input
                autoComplete="off"
                value={phoneId}
                onChange={e => setPhoneId(e.target.value)}
                className="saas-input w-full font-mono text-xs"
                placeholder="e.g. 103948572819401"
              />
              <p className="text-[11px] text-slate-400 mt-0.5">Found under WhatsApp &gt; API Setup &gt; Phone Number ID in Meta Developer Portal.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                WhatsApp Business Account ID (WABA ID)
              </label>
              <input
                autoComplete="off"
                value={wabaId}
                onChange={e => setWabaId(e.target.value)}
                className="saas-input w-full font-mono text-xs"
                placeholder="e.g. 102948571829304"
              />
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-md text-[11px] text-slate-500 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>System User Permanent Token is managed globally by SaaS System Manager.</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            {isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={saveManualCredentials}
              disabled={loading || !phoneId.trim()}
              className="btn-primary py-1.5 px-4 text-xs font-semibold flex items-center gap-1.5"
            >
              {loading ? (
                <Activity className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>Save Credentials</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
