using System;
using CodeX.Domain.Common;

namespace CodeX.Domain.Entities
{
    public class MedicineMaster : BaseEntity
    {
        public Guid OrganizationId { get; set; }
        
        public string Name { get; set; } = string.Empty;
        public string? GenericName { get; set; }
        public string? Type { get; set; }
        public string? Manufacturer { get; set; }
        
        // Navigation
        public virtual Organization Organization { get; set; } = null!;
    }
}
