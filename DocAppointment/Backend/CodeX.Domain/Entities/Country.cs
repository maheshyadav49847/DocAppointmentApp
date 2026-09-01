using CodeX.Domain.Common;

namespace CodeX.Domain.Entities
{
    public class Country : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string IsoCode { get; set; } = string.Empty;
        public string DialCode { get; set; } = string.Empty;
        public string CurrencyCode { get; set; } = string.Empty;
        public string CurrencySymbol { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
    }
}
