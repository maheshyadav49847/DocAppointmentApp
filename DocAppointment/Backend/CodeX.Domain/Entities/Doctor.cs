using CodeX.Domain.Common;

namespace CodeX.Domain.Entities
{
    public class Doctor : BaseEntity, IMustHaveTenant
    {
        public Guid OrganizationId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Specialization { get; set; } = string.Empty;
        public string? RegistrationNumber { get; set; }
        public decimal ConsultationFee { get; set; } = 0;
        public string? Gender { get; set; }
        public string? Qualification { get; set; }
        public string? Experience { get; set; }
        public string? Mobile { get; set; }
        public string? EmailId { get; set; }

        // Navigation Properties
        public virtual Organization Organization { get; set; } = null!;
        public virtual ICollection<Branch> Branches { get; set; } = new List<Branch>();
        public virtual ICollection<Session> Sessions { get; set; } = new List<Session>();
        public virtual ICollection<DailyQueue> DailyQueues { get; set; } = new List<DailyQueue>();
    }
}

