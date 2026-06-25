using System;

namespace CodeX.Domain.Entities
{
    public class RolePermission
    {
        public Guid RoleId { get; set; }
        public virtual Role Role { get; set; } = null!;

        public string Permission { get; set; } = string.Empty;
    }
}
