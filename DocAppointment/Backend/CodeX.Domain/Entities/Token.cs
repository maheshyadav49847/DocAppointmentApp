using CodeX.Domain.Common;
using CodeX.Domain.Enums;

namespace CodeX.Domain.Entities
{
    public class Token : BaseEntity, IMustHaveTenant
    {
        public Guid OrganizationId { get; set; }


        public Guid QueueId { get; set; }
        public Guid PatientId { get; set; }
        public int TokenNumber { get; set; }
        public TokenStatus Status { get; set; } = TokenStatus.Pending;
        public bool IsPriority { get; set; } = false;
        public BookingSource Source { get; set; } = BookingSource.WhatsApp;
        public DateTime BookedAt { get; set; } = DateTime.UtcNow;
        public DateTime? CalledAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public decimal FeePaid { get; set; } = 0;
        public PaymentMode PaymentMode { get; set; } = PaymentMode.Pending;
        public Guid? CreatedByStaffId { get; set; }

        public string ReferenceId => $"CX-{Id.ToString().Substring(0, 6).ToUpper()}";

        // Navigation Properties
        public virtual DailyQueue Queue { get; set; } = null!;
        public virtual Patient Patient { get; set; } = null!;
        public virtual Rating? Rating { get; set; }
        public virtual ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
    }
}

