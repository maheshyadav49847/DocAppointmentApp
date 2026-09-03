using CodeX.Domain.Common;
using CodeX.Domain.Enums;

namespace CodeX.Domain.Entities
{
    public class Invoice : BaseEntity, IMustHaveTenant
    {
        public Guid OrganizationId { get; set; }
        public Guid BranchId { get; set; }
        
        public string InvoiceNumber { get; set; } = string.Empty;
        
        public Guid PatientId { get; set; }
        public virtual Patient Patient { get; set; } = null!;

        public Guid? TokenId { get; set; }
        public virtual Token? Token { get; set; }
        
        public Guid? DoctorId { get; set; }
        public virtual Doctor? Doctor { get; set; }

        public decimal SubTotal { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        
        public InvoiceStatus Status { get; set; } = InvoiceStatus.Unpaid;
        
        public string? Notes { get; set; }

        public virtual ICollection<InvoiceItem> Items { get; set; } = new List<InvoiceItem>();
        public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();
    }
}
