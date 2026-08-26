namespace CodeX.Domain.Entities
{
    public class ApplicationSetting
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public string Key { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty;
        public bool IsSensitive { get; set; }
        public DateTime LastModified { get; set; } = DateTime.UtcNow;
    }
}
