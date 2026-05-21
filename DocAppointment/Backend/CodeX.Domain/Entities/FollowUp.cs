using System;
using CodeX.Domain.Common;

namespace CodeX.Domain.Entities
{
    public class FollowUp : BaseEntity
    {
        public Guid PatientId { get; set; }
        public Guid? PatientVisitId { get; set; }
        public DateTime FollowUpDate { get; set; }
        public bool ReminderEnabled { get; set; } = true;
        public bool WhatsAppSent { get; set; } = false;
        public string? Instructions { get; set; }

        // Navigation Property
        public virtual Patient Patient { get; set; } = null!;
    }
}
