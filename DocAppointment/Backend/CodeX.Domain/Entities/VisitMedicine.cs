using System;
using CodeX.Domain.Common;

namespace CodeX.Domain.Entities
{
    public class VisitMedicine : BaseEntity
    {
        public Guid PatientVisitId { get; set; }
        public string MedicineName { get; set; } = string.Empty;
        public string Dosage { get; set; } = string.Empty; // e.g. "SOS", "3 Days", "Twice Daily"
        
        public string? MedicineType { get; set; }
        public string? DoseQty { get; set; }
        public string? DoseSchedule { get; set; }
        public string? FoodTiming { get; set; }
        public string? CourseDuration { get; set; }
        public string? ClinicalInstructions { get; set; }

        // Navigation Property
        public virtual PatientVisit PatientVisit { get; set; } = null!;
    }
}
