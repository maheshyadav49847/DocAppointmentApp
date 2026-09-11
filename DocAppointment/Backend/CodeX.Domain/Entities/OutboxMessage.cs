using CodeX.Domain.Common;
using System;

namespace CodeX.Domain.Entities
{
    public class OutboxMessage : BaseEntity
    {
        public Guid BranchId { get; set; }
        public Guid? TokenId { get; set; }
        public Guid? PatientVisitId { get; set; }
        
        /// <summary>
        /// Channel name: "Telegram", "WhatsApp", "SMS", "Email"
        /// </summary>
        public string Channel { get; set; } = "Telegram";

        /// <summary>
        /// Type of message: "Prescription", "BookingConfirmation", "Alert", "Feedback"
        /// </summary>
        public string MessageType { get; set; } = "Prescription";

        /// <summary>
        /// Target Chat ID or Phone Number or Email
        /// </summary>
        public string Recipient { get; set; } = string.Empty;

        /// <summary>
        /// Text message or caption
        /// </summary>
        public string? MessageBody { get; set; }

        /// <summary>
        /// File name if sending document (e.g. "Prescription.pdf")
        /// </summary>
        public string? FileName { get; set; }

        /// <summary>
        /// Base64 payload or storage path
        /// </summary>
        public string? FileBase64 { get; set; }

        /// <summary>
        /// Status: "Pending", "Processing", "Sent", "Failed", "DeadLetter"
        /// </summary>
        public string Status { get; set; } = "Pending";

        /// <summary>
        /// Priority of message dispatch:
        /// 100 = Critical / OTP / Security Alert
        /// 50  = Turn Alerts / Live Queue Notifications
        /// 20  = Booking Confirmations / Invoices
        /// 10  = Prescriptions (large payloads)
        /// 5   = Marketing / Feedback / Bulk Follow-ups
        /// Higher number = Higher priority
        /// </summary>
        public int Priority { get; set; } = 10;

        public int RetryCount { get; set; } = 0;
        public int MaxRetries { get; set; } = 3;
        public DateTime? NextRetryAtUtc { get; set; }
        public DateTime? ProcessedAtUtc { get; set; }
        public string? ErrorMessage { get; set; }

        // Navigation
        public virtual Branch Branch { get; set; } = null!;
        public virtual Token? Token { get; set; }
        public virtual PatientVisit? PatientVisit { get; set; }
    }
}
