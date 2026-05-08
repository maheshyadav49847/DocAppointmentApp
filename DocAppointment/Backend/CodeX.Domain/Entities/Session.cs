using System;
using CodeX.Domain.Common;

namespace CodeX.Domain.Entities
{
    public class Session : BaseEntity
    {
        public Guid DoctorId { get; set; }
        public Guid BranchId { get; set; }
        public string SessionName { get; set; } = string.Empty; // e.g., "Morning"
        public int DayOfWeek { get; set; } // 0-6 (Sunday-Saturday)
        public bool IsDaily { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public int DefaultCapacity { get; set; }

        // Navigation Property
        public virtual Doctor Doctor { get; set; } = null!;
        public virtual Branch Branch { get; set; } = null!;
    }
}
