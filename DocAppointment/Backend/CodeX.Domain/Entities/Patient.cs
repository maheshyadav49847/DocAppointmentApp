using System;
using System.Collections.Generic;
using CodeX.Domain.Common;

namespace CodeX.Domain.Entities
{
    public class Patient : BaseEntity
    {
        public Patient()
        {
            // Generate a default code for new instances. Existing rows will get updated by DB migration or fallback logic.
            PatientCode = "PT-" + Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper();
        }

        public string PatientCode { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? MetaDataJson { get; set; } // For preferences, age, etc.
        public string? Age { get; set; }
        public string? Gender { get; set; }
        public string? BloodGroup { get; set; }
        public string? ChronicTags { get; set; }

        // Navigation Properties
        public virtual ICollection<Token> Tokens { get; set; } = new List<Token>();
        public virtual ICollection<PatientVisit> Visits { get; set; } = new List<PatientVisit>();
        public virtual ICollection<PatientAttachment> Attachments { get; set; } = new List<PatientAttachment>();
        public virtual ICollection<FollowUp> FollowUps { get; set; } = new List<FollowUp>();
    }
}
