import { api } from "@/lib/axios";
import { generateBase64PdfFromElement } from "@/utils/pdfUtils";
import toast from "react-hot-toast";

export interface PrescriptionDispatchOptions {
  printElement: HTMLElement | null;
  patient: {
    id?: string;
    name?: string;
    phone?: string;
    telegramChatId?: string;
  } | null;
  currentBranch?: {
    name?: string;
    isWhatsAppConfigured?: boolean;
    isTelegramConfigured?: boolean;
  } | null;
  currentBranchId?: string;
  tokenId?: string;
  patientVisitId?: string;
  bookingSource?: string;
  recommendedChannel?: 'Telegram' | 'WhatsApp' | 'None';
}

/**
 * Dispatches prescription PDF asynchronously in the background.
 * Enforces Single-Channel Affinity & Intelligent Fallback:
 * - If booking was Telegram -> Strictly Telegram (Never WhatsApp)
 * - If booking was WhatsApp -> Strictly WhatsApp (Never Telegram)
 * - If Offline/Walk-In -> Priority 1: WhatsApp (if configured), Priority 2: Telegram (if configured), Priority 3: None
 * - Never dispatches to both channels simultaneously!
 */
export function dispatchPrescriptionInBackground(options: PrescriptionDispatchOptions) {
  const { printElement, patient, currentBranch, currentBranchId, tokenId, patientVisitId, bookingSource, recommendedChannel } = options;

  if (!printElement) {
    console.warn("[Prescription Dispatcher] No print element provided for background PDF dispatch.");
    return;
  }

  // Resolve single channel
  let targetChannel: 'Telegram' | 'WhatsApp' | 'None' = recommendedChannel || 'None';

  if (!recommendedChannel || recommendedChannel === 'None') {
    const isTgConfigured = currentBranch?.isTelegramConfigured ?? true;
    const isWaConfigured = currentBranch?.isWhatsAppConfigured ?? false;
    const hasPhone = !!patient?.phone;
    const hasTg = !!patient?.telegramChatId;

    if (bookingSource === 'Telegram') {
      targetChannel = (isTgConfigured && hasTg) ? 'Telegram' : 'None';
    } else if (bookingSource === 'WhatsApp') {
      targetChannel = (isWaConfigured && hasPhone) ? 'WhatsApp' : 'None';
    } else {
      // Offline / Walk-in booking:
      if (isWaConfigured && hasPhone) {
        targetChannel = 'WhatsApp';
      } else if (isTgConfigured && hasTg) {
        targetChannel = 'Telegram';
      } else {
        targetChannel = 'None';
      }
    }
  }

  if (targetChannel === 'None') {
    console.log("[Prescription Dispatcher] No active online communication channel available for this booking cycle. Prescription saved locally without online dispatch.");
    return;
  }

  // Clone element snapshot so DOM state doesn't get corrupted when consultation form resets
  const clonedElement = printElement.cloneNode(true) as HTMLElement;
  clonedElement.style.position = "fixed";
  clonedElement.style.top = "0";
  clonedElement.style.left = "0";
  clonedElement.style.width = "850px";
  clonedElement.style.opacity = "0";
  clonedElement.style.pointerEvents = "none";
  clonedElement.style.zIndex = "-99999";
  document.body.appendChild(clonedElement);

  // Run in decoupled asynchronous task
  setTimeout(async () => {
    try {
      console.log(`[Prescription Dispatcher] Generating base64 PDF in background for single channel: ${targetChannel}...`);
      const base64Pdf = await generateBase64PdfFromElement(clonedElement);

      const clinicName = currentBranch?.name || "the clinic";
      const patientDisplayName = patient?.name || "Patient";
      const prescriptionMsg = `Hello ${patientDisplayName}, here is your prescription from your recent consultation at ${clinicName}.`;
      const fileName = `Prescription_${patientDisplayName.replace(/\s+/g, '_')}.pdf`;
      const branchParam = currentBranchId || "default";

      if (targetChannel === 'Telegram' && patient?.telegramChatId) {
        console.log("[Prescription Dispatcher] Dispatching PDF exclusively via Telegram to chatId:", patient.telegramChatId);
        await api.post(`/telegram/messages/send/${branchParam}`, {
          chatId: patient.telegramChatId,
          message: prescriptionMsg,
          fileBase64: base64Pdf,
          fileName: fileName,
          tokenId: tokenId || undefined,
          patientVisitId: patientVisitId || undefined,
          priority: 10
        });
        toast.success(`Prescription queued to send to ${patientDisplayName} via Telegram!`, { id: `tg-${patient?.id}` });
      } else if (targetChannel === 'WhatsApp' && patient?.phone) {
        console.log("[Prescription Dispatcher] Dispatching PDF exclusively via WhatsApp to phone:", patient.phone);
        await api.post(`/whatsapp/messages/send/${branchParam}`, {
          to: patient.phone,
          message: prescriptionMsg,
          fileBase64: base64Pdf,
          fileName: fileName,
          tokenId: tokenId || undefined,
          patientVisitId: patientVisitId || undefined,
          priority: 10
        });
        toast.success(`Prescription queued to send to ${patientDisplayName} via WhatsApp!`, { id: `wa-${patient?.id}` });
      }
    } catch (err: any) {
      console.error("[Prescription Dispatcher] Background PDF dispatch error:", err?.response?.data || err.message);
    } finally {
      if (clonedElement.parentNode) {
        clonedElement.parentNode.removeChild(clonedElement);
      }
    }
  }, 50);
}
