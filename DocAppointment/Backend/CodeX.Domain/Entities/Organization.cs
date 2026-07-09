using CodeX.Domain.Common;

namespace CodeX.Domain.Entities
{
    public class Organization : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty; // For URL-friendly names
        public string? SettingsJson { get; set; } // Stores branding/global configs

        // Navigation Property
        public virtual ICollection<Branch> Branches { get; set; } = new List<Branch>();
    }
}
