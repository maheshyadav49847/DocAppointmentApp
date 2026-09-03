using CodeX.Domain.Common;

namespace CodeX.Domain.Entities
{
    public class VisitService : BaseEntity
    {
        public Guid PatientVisitId { get; set; }
        public Guid ServiceItemId { get; set; }
        public int Quantity { get; set; } = 1;
        public string? Notes { get; set; }

        // Navigation Properties
        public virtual PatientVisit PatientVisit { get; set; } = null!;
        public virtual ServiceItem ServiceItem { get; set; } = null!;
    }
}
