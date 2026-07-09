using CodeX.Domain.Common;

namespace CodeX.Domain.Entities
{
    public class Rating : BaseEntity
    {
        public Guid TokenId { get; set; }
        public int Score { get; set; } // 1-5
        public string? Comment { get; set; }

        // Navigation Property
        public virtual Token Token { get; set; } = null!;
    }
}
