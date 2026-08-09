using CodeX.Domain.Common;
using CodeX.Domain.Enums;

namespace CodeX.Domain.Entities
{
    public class DailyQueue : BaseEntity
    {
        public Guid BranchId { get; set; }
        public Guid DoctorId { get; set; }
        public Guid SessionId { get; set; }
        public DateTime QueueDate { get; set; }
        public QueueStatus Status { get; set; } = QueueStatus.Open;
        public DateTime? ActualStartAt { get; set; }
        public DateTime? ActualEndAt { get; set; }
        public int CurrentTokenNumber { get; set; } = 0;
        public DateTime? PausedUntil { get; set; }
        public string? PauseReason { get; set; }

        // Navigation Properties
        public virtual Branch Branch { get; set; } = null!;
        public virtual Doctor Doctor { get; set; } = null!;
        public virtual Session Session { get; set; } = null!;
        public virtual ICollection<Token> Tokens { get; set; } = new List<Token>();
    }
}
