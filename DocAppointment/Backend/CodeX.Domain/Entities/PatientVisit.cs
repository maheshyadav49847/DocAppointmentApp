using System;
using System.Collections.Generic;
using CodeX.Domain.Common;

namespace CodeX.Domain.Entities
{
    public class PatientVisit : BaseEntity
    {
        public Guid PatientId { get; set; }
        public Guid? TokenId { get; set; }
        public Guid DoctorId { get; set; }
        public DateTime VisitDate { get; set; } = DateTime.UtcNow;
        public string? Symptoms { get; set; }
        public string? Diagnosis { get; set; }
        public string? Advice { get; set; }
        public string? InternalNotes { get; set; }
        public DateTime? FollowUpDate { get; set; }

        // Navigation Properties
        public virtual Patient Patient { get; set; } = null!;
        public virtual Doctor Doctor { get; set; } = null!;
        public virtual Token? Token { get; set; }
        public virtual ICollection<VisitMedicine> Medicines { get; set; } = new List<VisitMedicine>();
        public virtual ICollection<PatientAttachment> Attachments { get; set; } = new List<PatientAttachment>();
    }
}
