using System;
using System.Collections.Generic;
using CodeX.Domain.Common;

namespace CodeX.Domain.Entities
{
    public class Branch : BaseEntity, IMustHaveTenant
    {
        public Guid OrganizationId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string WhatsAppNumber { get; set; } = string.Empty;
        public string? WhatsAppApiKey { get; set; }
        public string Timezone { get; set; } = "India Standard Time";

        // Navigation Properties
        public virtual Organization? Organization { get; set; }
        public virtual ICollection<Doctor>? Doctors { get; set; } = new List<Doctor>();
        public virtual ICollection<DailyQueue>? DailyQueues { get; set; } = new List<DailyQueue>();
    }
}

