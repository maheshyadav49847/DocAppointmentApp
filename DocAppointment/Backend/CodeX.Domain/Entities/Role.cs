using System;
using System.Collections.Generic;
using CodeX.Domain.Common;

namespace CodeX.Domain.Entities
{
    public class Role : BaseEntity, IMustHaveTenant
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        
        // If true, this is a built-in role (Admin, Doctor, etc.) that cannot be deleted.
        public bool IsSystemDefault { get; set; } = false;
        
        public Guid OrganizationId { get; set; }
        public virtual Organization Organization { get; set; } = null!;
        
        public virtual ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
        public virtual ICollection<Staff> StaffMembers { get; set; } = new List<Staff>();
    }
}
