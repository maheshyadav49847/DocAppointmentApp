using CodeX.Domain.Common;
using CodeX.Domain.Enums;

namespace CodeX.Domain.Entities
{
    public class LeaveRecord : BaseEntity, IMustHaveTenant
    {
        public Guid OrganizationId { get; set; }
        public Guid? BranchId { get; set; }
        public Guid? StaffId { get; set; }
        public Guid? DoctorId { get; set; }

        public LeaveType LeaveType { get; set; } = LeaveType.Planned;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }

        public Guid? SessionId { get; set; } // Specific OPD shift if applicable

        public string Reason { get; set; } = string.Empty;
        public string? PublicNotice { get; set; } // Patient-visible notice

        public LeaveStatus Status { get; set; } = LeaveStatus.Pending;

        public Guid AppliedByStaffId { get; set; }
        public Guid? ApprovedByStaffId { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public string? RejectionReason { get; set; }

        public bool NotifyPatients { get; set; } = true;
        public int AffectedTokensCount { get; set; } = 0;

        // Navigation Properties
        public virtual Organization Organization { get; set; } = null!;
        public virtual Branch? Branch { get; set; }
        public virtual Staff? Staff { get; set; }
        public virtual Doctor? Doctor { get; set; }
        public virtual Session? Session { get; set; }
    }
}
