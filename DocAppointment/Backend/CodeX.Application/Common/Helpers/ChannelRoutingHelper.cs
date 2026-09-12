using CodeX.Domain.Entities;
using CodeX.Domain.Enums;

namespace CodeX.Application.Common.Helpers
{
    public enum CommunicationChannel
    {
        None = 0,
        WhatsApp = 1,
        Telegram = 2
    }

    public static class ChannelRoutingHelper
    {
        /// <summary>
        /// Resolves the single, definitive communication channel for a patient booking cycle.
        /// Rule 1: Telegram booking -> Strictly Telegram.
        /// Rule 2: WhatsApp booking -> Strictly WhatsApp.
        /// Rule 3: Offline booking (WalkIn/Phone) -> Priority 1: WhatsApp (if configured and phone present);
        ///                                          Priority 2: Telegram (if WhatsApp not configured, but Telegram is and TelegramChatId present);
        ///                                          Priority 3: None (flag/skip, never queue failing messages).
        /// </summary>
        public static CommunicationChannel ResolveChannel(Token? token, Branch? branch, Patient? patient)
        {
            if (token == null || branch == null || patient == null)
            {
                return CommunicationChannel.None;
            }

            return ResolveChannel(token.Source, branch.IsWhatsAppConfigured, branch.IsTelegramConfigured, patient.Phone, patient.TelegramChatId);
        }

        public static CommunicationChannel ResolveChannel(
            BookingSource source,
            bool isWhatsAppConfigured,
            bool isTelegramConfigured,
            string? phone,
            string? telegramChatId)
        {
            bool hasPhone = !string.IsNullOrWhiteSpace(phone);
            bool hasTelegram = !string.IsNullOrWhiteSpace(telegramChatId);

            // Rule 1: Booking initiated via Telegram -> STRICTLY Telegram (Never WhatsApp)
            if (source == BookingSource.Telegram)
            {
                if (isTelegramConfigured && hasTelegram)
                {
                    return CommunicationChannel.Telegram;
                }
                return CommunicationChannel.None;
            }

            // Rule 2: Booking initiated via WhatsApp -> STRICTLY WhatsApp (Never Telegram)
            if (source == BookingSource.WhatsApp)
            {
                if (isWhatsAppConfigured && hasPhone)
                {
                    return CommunicationChannel.WhatsApp;
                }
                return CommunicationChannel.None;
            }

            // Rule 3: Offline Booking (WalkIn, Phone)
            // Priority 1: WhatsApp (if branch has WhatsApp configured and patient has phone)
            if (isWhatsAppConfigured && hasPhone)
            {
                return CommunicationChannel.WhatsApp;
            }

            // Priority 2: Telegram (if WhatsApp unconfigured/unavailable, but Telegram is configured and patient has TelegramChatId)
            if (isTelegramConfigured && hasTelegram)
            {
                return CommunicationChannel.Telegram;
            }

            // Priority 3: Neither available -> None
            return CommunicationChannel.None;
        }
    }
}
