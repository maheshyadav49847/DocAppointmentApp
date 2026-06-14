using System;
using CodeX.Domain.Common;

namespace CodeX.Domain.Entities
{
    public class OrganizationSubscription : BaseEntity, IMustHaveTenant
    {
        public Guid OrganizationId { get; set; }
        public Guid SubscriptionPlanId { get; set; }
        public string? RazorpaySubscriptionId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Status { get; set; } = "Active"; // Active, Expired, Cancelled, PastDue

        // Navigation Properties
        public virtual Organization Organization { get; set; } = null!;
        public virtual SubscriptionPlan SubscriptionPlan { get; set; } = null!;
    }
}
