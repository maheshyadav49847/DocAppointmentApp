using System;
using System.Collections.Generic;
using CodeX.Domain.Common;

namespace CodeX.Domain.Entities
{
    public class Doctor : BaseEntity
    {
        public Guid BranchId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Specialization { get; set; } = string.Empty;
        public string? RegistrationNumber { get; set; }

        // Navigation Properties
        public virtual Branch Branch { get; set; } = null!;
        public virtual ICollection<Session> Sessions { get; set; } = new List<Session>();
        public virtual ICollection<DailyQueue> DailyQueues { get; set; } = new List<DailyQueue>();
    }
}
