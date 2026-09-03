using CodeX.Domain.Common;

namespace CodeX.Domain.Entities
{
    public class ServiceItem : BaseEntity, IMustHaveTenant
    {
        public Guid OrganizationId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Category { get; set; }
        public decimal DefaultPrice { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
