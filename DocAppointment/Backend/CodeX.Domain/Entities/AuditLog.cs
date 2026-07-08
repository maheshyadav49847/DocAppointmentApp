namespace CodeX.Domain.Entities
{
    public class AuditLog
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string? UserId { get; set; }
        public Guid? OrganizationId { get; set; }
        public string Action { get; set; } = string.Empty;
        public string Path { get; set; } = string.Empty;
        public string Method { get; set; } = string.Empty;
        public string IpAddress { get; set; } = string.Empty;
        public string? RequestPayload { get; set; }
        public int StatusCode { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
