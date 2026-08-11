import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';

declare const FB: any;

interface MetaEmbeddedSignupProps {
  branch: any;
  onSuccess: () => void;
}

export default function MetaEmbeddedSignup({ branch, onSuccess }: MetaEmbeddedSignupProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  // Manual credentials state
  const [wabaId, setWabaId] = useState(branch?.metaWabaId || '');
  const [phoneId, setPhoneId] = useState(branch?.metaPhoneNumberId || '');
  const [systemToken, setSystemToken] = useState(branch?.metaSystemUserToken || '');

  const [appId, setAppId] = useState<string>('');
  const [configId, setConfigId] = useState<string>('');
  const [sdkLoaded, setSdkLoaded] = useState(false);

  useEffect(() => {
    // Fetch Meta Settings from backend
    api.get('/system/meta-settings').then(res => {
      const { appId, configId } = res.data;
      setAppId(appId);
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
          phoneNumberId: 'PHONE_FROM_OAUTH', 
          systemUserToken: import.meta.env.VITE_META_CONFIG_ID || 'SYSTEM_TOKEN'
        }).then(() => {
          onSuccess();
          setLoading(false);
        }).catch((err: any) => {
          setError(err.response?.data || err.message);
          setLoading(false);
        });

      } else {
        setError('Login was blocked by Meta because the app is not an approved Tech Provider. Please use Manual Setup instead.');
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
    if (!phoneId || !systemToken) {
      setError("Phone Number ID and System Token are required.");
      return;
    }
    
    setLoading(true);
    api.post('/meta/whatsapp/save-credentials', {
      branchId: branch.id,
      wabaId: wabaId || 'MANUAL_WABA',
      phoneNumberId: phoneId,
      systemUserToken: systemToken
    }).then(() => {
      onSuccess();
      setLoading(false);
    }).catch((err: any) => {
      setError(err.response?.data || err.message);
      setLoading(false);
    });
  };

  if (showManual) {
    return (
      <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-indigo-200 rounded-xl bg-indigo-50/50 w-full text-left">
        <h3 className="text-lg font-bold text-slate-900 mb-2 w-full text-center">Manual Meta Setup</h3>
        <p className="text-xs text-slate-500 text-center mb-4">
          Since your app is not an approved Meta Tech Provider, you must generate a permanent token in the Meta Developer Dashboard and paste the IDs below.
        </p>
        
        {error && (
          <div className="w-full bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 border border-red-100">
            {error}
          </div>
        )}

        <div className="w-full space-y-3 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Business Account ID (Optional)</label>
            <input type="text" value={wabaId} onChange={e => setWabaId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g. 10123456789" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number ID</label>
            <input type="text" value={phoneId} onChange={e => setPhoneId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g. 20123456789" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">System User Permanent Token</label>
            <input type="password" value={systemToken} onChange={e => setSystemToken(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="EAAG..." />
          </div>
        </div>

        <div className="flex gap-2 w-full">
          <button onClick={() => setShowManual(false)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg w-1/3">Back</button>
          <button onClick={saveManualCredentials} disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg w-2/3 flex justify-center items-center">
            {loading ? 'Saving...' : 'Save Credentials'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-indigo-200 rounded-xl bg-indigo-50/50">
      <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-600/20 mb-4">
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">Connect with Meta (Official)</h3>
      <p className="text-sm text-slate-600 text-center mb-6 max-w-sm">
        Connect your clinic's official WhatsApp Business Account directly with Meta. This provides unlimited messaging without QR code scanning.
      </p>

      {error && (
        <div className="w-full bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 border border-red-100">
          {error}
        </div>
      )}

      <button
        onClick={launchWhatsAppSignup}
        disabled={loading}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-all flex items-center gap-2 disabled:opacity-70 mb-3"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Connecting...
          </>
        ) : (
          <>Continue with Facebook</>
        )}
      </button>

      <button onClick={() => setShowManual(true)} className="text-xs text-slate-500 underline hover:text-slate-700">
        Enter IDs Manually (For Testing)
      </button>
    </div>
  );
}
