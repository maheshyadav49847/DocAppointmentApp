using System;
using CodeX.Domain.Common;

namespace CodeX.Domain.Entities
{
    public class MessageLog : BaseEntity
    {
        public Guid BranchId { get; set; }
        public Guid? TokenId { get; set; }
        public string RecipientPhone { get; set; } = string.Empty;
        public string MessageType { get; set; } = string.Empty; // e.g., "BookingConfirmation", "Reminder"
        public string Status { get; set; } = "Sent"; // Sent, Delivered, Failed
        public string? ErrorMessage { get; set; }

        // Navigation Properties
        public virtual Branch Branch { get; set; } = null!;
        public virtual Token? Token { get; set; }
    }
}
