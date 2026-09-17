import { useState, useEffect } from 'react'
import {
  BookOpen, Smartphone, Send, CheckCircle2,
  ExternalLink, Copy, Check, ShieldCheck, X
} from 'lucide-react'

interface BranchConfigGuideModalProps {
  isOpen: boolean
  onClose: () => void
  channel?: 'whatsapp' | 'telegram' | 'all'
  initialTab?: 'whatsapp' | 'telegram'
}

export default function BranchConfigGuideModal({
  isOpen,
  onClose,
  channel = 'all',
  initialTab
}: BranchConfigGuideModalProps) {
  const effectiveChannel = channel || (initialTab ? initialTab : 'all')
  const [selectedTab, setSelectedTab] = useState<'whatsapp' | 'telegram'>(
    effectiveChannel === 'telegram' ? 'telegram' : 'whatsapp'
  )
  const [copiedText, setCopiedText] = useState<string | null>(null)

  useEffect(() => {
    if (effectiveChannel === 'telegram') {
      setSelectedTab('telegram')
    } else if (effectiveChannel === 'whatsapp') {
      setSelectedTab('whatsapp')
    }
  }, [effectiveChannel])

  if (!isOpen) return null

  const activeTab = effectiveChannel === 'all' ? selectedTab : effectiveChannel
  const isDedicated = effectiveChannel === 'whatsapp' || effectiveChannel === 'telegram'

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(id)
    setTimeout(() => setCopiedText(null), 2000)
  }

  // Header dynamic setup
  let headerIcon = <BookOpen className='w-5 h-5 text-indigo-600' />
  let headerIconBg = 'bg-indigo-50 text-indigo-600 border-indigo-200/80'
  let headerTitle = 'Communication Bot Configuration Guide'
  let headerSubtitle = 'Step-by-step setup for WhatsApp Meta Tech Provider & Telegram BotFather'

  if (effectiveChannel === 'whatsapp') {
    headerIcon = <Smartphone className='w-5 h-5 text-emerald-600' />
    headerIconBg = 'bg-emerald-50 text-emerald-600 border-emerald-200/80'
    headerTitle = 'WhatsApp Bot Setup Guide'
    headerSubtitle = 'Step-by-step Meta Tech Provider & Cloud API credentials onboarding'
  } else if (effectiveChannel === 'telegram') {
    headerIcon = <Send className='w-5 h-5 text-sky-600' />
    headerIconBg = 'bg-sky-50 text-sky-600 border-sky-200/80'
    headerTitle = 'Telegram Bot Setup Guide'
    headerSubtitle = 'Step-by-step BotFather token generation & webhook integration'
  }

  return (
    <div className='fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200'>
      <div className='bg-white rounded-lg shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200'>
        
        {/* Header */}
        <div className='flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50'>
          <div className='flex items-center gap-3'>
            <div className={`w-10 h-10 rounded-md border flex items-center justify-center shrink-0 ${headerIconBg}`}>
              {headerIcon}
            </div>
            <div>
              <h2 className='text-lg font-bold text-slate-900 flex items-center gap-2'>
                {headerTitle}
              </h2>
              <p className='text-xs text-slate-500 font-medium'>
                {headerSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-md transition-colors'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Tab Selection Bar - Only visible when all channels are open */}
        {!isDedicated && (
          <div className='flex border-b border-slate-200 bg-slate-50/70 px-6 pt-3 gap-2'>
            <button
              onClick={() => setSelectedTab('whatsapp')}
              className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'whatsapp'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Smartphone className='w-4 h-4 text-emerald-600' />
              <span>WhatsApp (Meta Tech Provider)</span>
            </button>
            <button
              onClick={() => setSelectedTab('telegram')}
              className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'telegram'
                  ? 'border-sky-600 text-sky-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Send className='w-4 h-4 text-sky-600' />
              <span>Telegram (BotFather Token)</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className='flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30'>
          {activeTab === 'whatsapp' ? (
            <div className='space-y-6'>
              {/* Overview Banner */}
              <div className='p-4 bg-emerald-50/80 border border-emerald-200/80 rounded-lg flex items-start gap-3'>
                <div className='p-2 bg-emerald-100/70 text-emerald-800 rounded-md shrink-0 mt-0.5'>
                  <Smartphone className='w-5 h-5' />
                </div>
                <div className='text-xs text-emerald-900 leading-relaxed'>
                  <span className='font-bold block text-sm mb-0.5'>Official Meta Tech Provider Architecture</span>
                  DocAppointmentApp operates as an official Meta Business Tech Provider. Clinics can register their official WhatsApp Business phone number directly without running custom servers or keeping an active phone connected.
                </div>
              </div>

              {/* Step-by-Step Flow */}
              <div className='space-y-3'>
                <h4 className='text-xs font-bold uppercase tracking-wider text-slate-400'>Step-by-Step Setup</h4>

                <div className='bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-3'>
                  <div className='flex items-start gap-3'>
                    <span className='w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0'>1</span>
                    <div>
                      <p className='text-sm font-bold text-slate-800'>Launch Configuration</p>
                      <p className='text-xs text-slate-600 mt-0.5'>
                        On any active branch card, click the <strong className='text-emerald-700'>WhatsApp</strong> pill or the green message icon button in the card footer.
                      </p>
                    </div>
                  </div>

                  <div className='flex items-start gap-3 pt-3 border-t border-slate-100'>
                    <span className='w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0'>2</span>
                    <div>
                      <p className='text-sm font-bold text-slate-800'>Meta Embedded Signup</p>
                      <p className='text-xs text-slate-600 mt-0.5'>
                        Click <strong>Continue with Facebook</strong>. Log in with the Facebook account managing the clinic&apos;s Meta Business Manager.
                      </p>
                    </div>
                  </div>

                  <div className='flex items-start gap-3 pt-3 border-t border-slate-100'>
                    <span className='w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0'>3</span>
                    <div>
                      <p className='text-sm font-bold text-slate-800'>Select or Enter Clinic Phone Number</p>
                      <p className='text-xs text-slate-600 mt-0.5'>
                        Choose your existing WhatsApp Business Account (WABA) or create a new one, then enter the clinic&apos;s phone number and verify it via SMS or Voice OTP.
                      </p>
                    </div>
                  </div>

                  <div className='flex items-start gap-3 pt-3 border-t border-slate-100'>
                    <span className='w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0'>4</span>
                    <div>
                      <p className='text-sm font-bold text-slate-800'>Automatic Credential Binding</p>
                      <p className='text-xs text-slate-600 mt-0.5'>
                        Meta automatically issues the <code className='bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono text-[11px]'>WABA ID</code> and <code className='bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono text-[11px]'>Phone Number ID</code> back to the app. The channel status will update to <span className='text-emerald-700 font-bold'>Active</span> immediately.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Testing Guide */}
              <div className='bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-xs text-slate-700'>
                <span className='font-bold text-slate-900 flex items-center gap-1.5'>
                  <CheckCircle2 className='w-4 h-4 text-emerald-600' /> How to Test WhatsApp Booking:
                </span>
                <p>1. Send <strong>Hi</strong> or <strong>Book Appointment</strong> to the branch&apos;s WhatsApp number from any personal phone.</p>
                <p>2. The automated bot will reply with your clinic&apos;s personalized greeting and doctor list.</p>
                <p>3. Generate a token from the Desk Queue to confirm WhatsApp instant token reminders arrive automatically.</p>
              </div>
            </div>
          ) : (
            <div className='space-y-6'>
              {/* Overview Banner */}
              <div className='p-4 bg-sky-50/80 border border-sky-200/80 rounded-lg flex items-start gap-3'>
                <div className='p-2 bg-sky-100/70 text-sky-800 rounded-md shrink-0 mt-0.5'>
                  <Send className='w-5 h-5' />
                </div>
                <div className='text-xs text-sky-900 leading-relaxed'>
                  <span className='font-bold block text-sm mb-0.5'>Dedicated Telegram Bot per Branch</span>
                  Each facility can connect its own customized Telegram bot using Telegram&apos;s official BotFather. Patients can open your clinic mini-app, book tokens, and check live queue numbers directly inside Telegram.
                </div>
              </div>

              {/* Step-by-Step Flow */}
              <div className='space-y-3'>
                <h4 className='text-xs font-bold uppercase tracking-wider text-slate-400'>Step-by-Step Setup</h4>

                <div className='bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-3'>
                  <div className='flex items-start gap-3'>
                    <span className='w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center shrink-0'>1</span>
                    <div className='flex-1'>
                      <p className='text-sm font-bold text-slate-800 flex items-center justify-between'>
                        <span>Open BotFather in Telegram</span>
                        <a
                          href='https://t.me/BotFather'
                          target='_blank'
                          rel='noreferrer'
                          className='text-xs text-sky-600 hover:text-sky-800 inline-flex items-center gap-1 font-semibold'
                        >
                          Open @BotFather <ExternalLink className='w-3 h-3' />
                        </a>
                      </p>
                      <p className='text-xs text-slate-600 mt-0.5'>
                        Open Telegram, search for verified <strong>@BotFather</strong>, and press Start.
                      </p>
                    </div>
                  </div>

                  <div className='flex items-start gap-3 pt-3 border-t border-slate-100'>
                    <span className='w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center shrink-0'>2</span>
                    <div className='flex-1'>
                      <p className='text-sm font-bold text-slate-800'>Create New Bot</p>
                      <p className='text-xs text-slate-600 mt-0.5'>
                        Send <code className='bg-slate-100 px-1 py-0.5 rounded text-sky-700 font-mono text-[11px]'>/newbot</code>, choose a display name (e.g. <em>City Care Clinic</em>), and choose a unique username ending in <code className='bg-slate-100 px-1 py-0.5 rounded text-sky-700 font-mono text-[11px]'>bot</code> (e.g. <em>citycare_doc_bot</em>).
                      </p>
                    </div>
                  </div>

                  <div className='flex items-start gap-3 pt-3 border-t border-slate-100'>
                    <span className='w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center shrink-0'>3</span>
                    <div className='flex-1'>
                      <p className='text-sm font-bold text-slate-800'>Copy the HTTP API Token</p>
                      <p className='text-xs text-slate-600 mt-0.5'>
                        BotFather will return an API token in the format:
                      </p>
                      <div className='mt-1.5 p-2 bg-slate-900 text-slate-100 rounded-md font-mono text-[11px] flex items-center justify-between'>
                        <span>7123456789:AAHq_xSampleTokenString...</span>
                        <button
                          onClick={() => handleCopy('7123456789:AAHq_xSampleTokenString...', 'sample-token')}
                          className='text-slate-400 hover:text-white text-xs flex items-center gap-1'
                        >
                          {copiedText === 'sample-token' ? <Check className='w-3.5 h-3.5 text-emerald-400' /> : <Copy className='w-3.5 h-3.5' />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className='flex items-start gap-3 pt-3 border-t border-slate-100'>
                    <span className='w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center shrink-0'>4</span>
                    <div className='flex-1'>
                      <p className='text-sm font-bold text-slate-800'>Test Connection & Set Webhook</p>
                      <p className='text-xs text-slate-600 mt-0.5'>
                        Open the branch&apos;s <strong>Telegram Config</strong> modal, paste the token, and click <strong>Test Connection</strong>. Once verified, click <strong>Set Webhook Automatically</strong> and save.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bot Commands Reference */}
              <div className='bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-xs text-slate-700'>
                <span className='font-bold text-slate-900 flex items-center gap-1.5'>
                  <CheckCircle2 className='w-4 h-4 text-sky-600' /> Optional: Set Bot Menu Commands in @BotFather
                </span>
                <p className='text-slate-500'>Send <code className='bg-slate-200 px-1 py-0.5 rounded text-[11px]'>/setcommands</code> to BotFather, pick your bot, and paste:</p>
                <div className='p-2 bg-slate-900 text-slate-200 rounded-md font-mono text-[11px]'>
                  start - Open clinic booking portal<br />
                  status - Check live queue token status
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between'>
          <div className='flex items-center gap-2 text-xs text-slate-500 font-medium'>
            <ShieldCheck className='w-4 h-4 text-indigo-600' />
            <span>Each branch maintains 100% data and channel isolation.</span>
          </div>
          <button
            onClick={onClose}
            className='btn-secondary py-1.5 px-4 text-xs'
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  )
}
