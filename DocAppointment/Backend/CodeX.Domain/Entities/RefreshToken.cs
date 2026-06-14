using System;
using CodeX.Domain.Common;

namespace CodeX.Domain.Entities
{
    public class RefreshToken : BaseEntity
    {
        public Guid StaffId { get; set; }
        public string Token { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        public bool IsRevoked { get; set; }

        public virtual Staff Staff { get; set; } = null!;
    }
}
