using System;
using CodeX.Domain.Common;
using CodeX.Domain.Enums;

namespace CodeX.Domain.Entities
{
    public class Staff : BaseEntity, IMustHaveTenant
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

        // Account Lockout
        public int FailedLoginAttempts { get; set; } = 0;
        public DateTime? LockoutEnd { get; set; }

        // Navigation Properties
        public virtual Organization Organization { get; set; } = null!;
        public virtual Branch? Branch { get; set; }
        public Guid? DoctorId { get; set; }
        public virtual Doctor? Doctor { get; set; }
        
        public virtual ICollection<UserSession> UserSessions { get; set; } = new List<UserSession>();
        public virtual ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    }
}

