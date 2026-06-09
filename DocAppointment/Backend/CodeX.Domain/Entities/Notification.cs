using System;
using CodeX.Domain.Common;

namespace CodeX.Domain.Entities
{
    public class Notification : BaseEntity
    {
        public Guid OrganizationId { get; set; }
        public Guid? BranchId { get; set; }
        public string? UserId { get; set; }
        
        public string Title { get; set; } = null!;
        public string Message { get; set; } = null!;
        public string Type { get; set; } = "Info"; // Info, Alert, Success
        public bool IsRead { get; set; } // If UserId is set, we can use this. For branch-wide, we might rely on frontend state.
    }
}
