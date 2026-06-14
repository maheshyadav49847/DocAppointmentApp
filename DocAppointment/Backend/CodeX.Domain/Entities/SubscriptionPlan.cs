using CodeX.Domain.Common;

namespace CodeX.Domain.Entities
{
    public class SubscriptionPlan : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string Currency { get; set; } = "INR";
        public int IntervalDays { get; set; } = 30; // 30 for monthly, 365 for yearly
        
        // Limits
        public int MaxBranches { get; set; } = 1;
        public int MaxDoctors { get; set; } = 5;
        public int MaxStaff { get; set; } = 10;
        public int MaxPatientsPerMonth { get; set; } = 1000;
    }
}
