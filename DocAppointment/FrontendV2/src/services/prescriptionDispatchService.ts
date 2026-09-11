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
  } | null;
  currentBranchId?: string;
  tokenId?: string;
  patientVisitId?: string;
}

/**
 * Dispatches prescription PDF asynchronously in the background.
 * Does NOT block UI, returns immediately, and shows non-intrusive toast notifications.
 */
export function dispatchPrescriptionInBackground(options: PrescriptionDispatchOptions) {
  const { printElement, patient, currentBranch, currentBranchId, tokenId, patientVisitId } = options;

  if (!printElement) {
    console.warn("[Prescription Dispatcher] No print element provided for background PDF dispatch.");
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
      console.log("[Prescription Dispatcher] Generating base64 PDF in background...");
      const base64Pdf = await generateBase64PdfFromElement(clonedElement);

      const clinicName = currentBranch?.name || "the clinic";
      const patientDisplayName = patient?.name || "Patient";
      const prescriptionMsg = `Hello ${patientDisplayName}, here is your prescription from your recent consultation at ${clinicName}.`;
      const fileName = `Prescription_${patientDisplayName.replace(/\s+/g, '_')}.pdf`;
      const branchParam = currentBranchId || "default";

      const promises: Promise<any>[] = [];

      // 1. Dispatch to Telegram
      if (patient?.telegramChatId) {
        console.log("[Prescription Dispatcher] Sending PDF to Telegram chatId:", patient.telegramChatId);
        promises.push(
          api.post(`/telegram/messages/send/${branchParam}`, {
            chatId: patient.telegramChatId,
            message: prescriptionMsg,
            fileBase64: base64Pdf,
            fileName: fileName,
            tokenId: tokenId || undefined,
            patientVisitId: patientVisitId || undefined,
            priority: 10
          }).then(() => {
            console.log("[Prescription Dispatcher] Successfully queued in Outbox for Telegram");
            toast.success(`Prescription queued to send to ${patientDisplayName} via Telegram!`, { id: `tg-${patient?.id}` });
          }).catch((err) => {
            console.error("[Prescription Dispatcher] Telegram dispatch error:", err?.response?.data || err.message);
          })
        );
      }

      // 2. Dispatch to WhatsApp
      if (patient?.phone) {
        console.log("[Prescription Dispatcher] Sending PDF to WhatsApp phone:", patient.phone);
        promises.push(
          api.post(`/whatsapp/messages/send/${branchParam}`, {
            to: patient.phone,
            message: prescriptionMsg,
            fileBase64: base64Pdf,
            fileName: fileName,
            tokenId: tokenId || undefined,
            patientVisitId: patientVisitId || undefined,
            priority: 10
          }).then(() => {
            console.log("[Prescription Dispatcher] Successfully queued in Outbox for WhatsApp");
            toast.success(`Prescription queued to send to ${patientDisplayName} via WhatsApp!`, { id: `wa-${patient?.id}` });
          }).catch((err) => {
            console.error("[Prescription Dispatcher] WhatsApp dispatch error:", err?.response?.data || err.message);
          })
        );
      }

      await Promise.allSettled(promises);
    } catch (err) {
      console.error("[Prescription Dispatcher] Background PDF generation failed:", err);
    } finally {
      if (clonedElement.parentNode) {
        clonedElement.parentNode.removeChild(clonedElement);
      }
    }
  }, 50);
}
