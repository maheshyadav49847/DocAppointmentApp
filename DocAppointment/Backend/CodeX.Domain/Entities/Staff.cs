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
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string EmployeeId { get; set; } = string.Empty;
        public StaffRole Role { get; set; } = StaffRole.Receptionist;
        public string? PasswordResetToken { get; set; }
        public DateTime? ResetTokenExpiry { get; set; }
        public string PhoneNumber { get; set; } = string.Empty;

        // Navigation Properties
        public virtual Organization Organization { get; set; } = null!;
        public virtual Branch? Branch { get; set; }
    }
}
