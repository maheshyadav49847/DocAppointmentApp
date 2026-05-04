using System;
using CodeX.Domain.Common;
using CodeX.Domain.Enums;

namespace CodeX.Domain.Entities
{
    public class Staff : BaseEntity
    {
        public Guid OrganizationId { get; set; }
        public Guid? BranchId { get; set; } // Optional for Org Admins
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public StaffRole Role { get; set; } = StaffRole.Receptionist;

        // Navigation Properties
        public virtual Organization Organization { get; set; } = null!;
        public virtual Branch? Branch { get; set; }
    }
}
