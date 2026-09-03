using CodeX.Domain.Common;
using CodeX.Domain.Enums;

namespace CodeX.Domain.Entities
{
    public class Payment : BaseEntity, IMustHaveTenant
    {
        public Guid OrganizationId { get; set; }
        
        public Guid InvoiceId { get; set; }
        public virtual Invoice Invoice { get; set; } = null!;

        public decimal Amount { get; set; }
        public PaymentMode PaymentMode { get; set; }
        public string? TransactionId { get; set; }
        public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
    }
}
