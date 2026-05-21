using System;
using CodeX.Domain.Common;

namespace CodeX.Domain.Entities
{
    public class VisitMedicine : BaseEntity
    {
        public Guid PatientVisitId { get; set; }
        public string MedicineName { get; set; } = string.Empty;
        public string Dosage { get; set; } = string.Empty; // e.g. "SOS", "3 Days", "Twice Daily"

        // Navigation Property
        public virtual PatientVisit PatientVisit { get; set; } = null!;
    }
}
