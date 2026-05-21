using System;
using CodeX.Domain.Common;

namespace CodeX.Domain.Entities
{
    public class PatientAttachment : BaseEntity
    {
        public Guid PatientId { get; set; }
        public Guid? PatientVisitId { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty; // e.g. "Prescription", "Lab Report", "X-Ray", "MRI Scan", "Other"
        public string FileUrl { get; set; } = string.Empty;
        public DateTime UploadDate { get; set; } = DateTime.UtcNow;

        // Navigation Properties
        public virtual Patient Patient { get; set; } = null!;
        public virtual PatientVisit? PatientVisit { get; set; }
    }
}
