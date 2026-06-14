using System;
using CodeX.Domain.Common;

namespace CodeX.Domain.Entities
{
    public class UserSession : BaseEntity
    {
        public Guid UserId { get; set; }
        public string SessionId { get; set; } = string.Empty;
        public string IpAddress { get; set; } = string.Empty;
        public string UserAgent { get; set; } = string.Empty;
        public DateTime LastActiveAt { get; set; }
        
        public virtual Staff User { get; set; } = null!;
    }
}
