using CodeX.Domain.Common;

namespace CodeX.Domain.Entities
{
    public class IdempotencyLog : BaseEntity
    {
        public string EventId { get; set; } = string.Empty;
        public string EventType { get; set; } = string.Empty;
        public string RequestBody { get; set; } = string.Empty;
        public bool IsProcessed { get; set; }
        public DateTime ProcessedAt { get; set; }
    }
}
