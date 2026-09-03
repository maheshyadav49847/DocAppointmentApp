using CodeX.Domain.Common;

namespace CodeX.Domain.Entities
{
    public class InvoiceItem : BaseEntity
    {
        public Guid InvoiceId { get; set; }
        public virtual Invoice Invoice { get; set; } = null!;

        public Guid? ServiceItemId { get; set; }
        public virtual ServiceItem? ServiceItem { get; set; }

        public string ItemName { get; set; } = string.Empty;
        
        public int Quantity { get; set; } = 1;
        public decimal UnitPrice { get; set; }
        public decimal TotalPrice { get; set; }
        
        public bool IsPrescribed { get; set; } = false;
    }
}
