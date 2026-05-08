using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using CodeX.Domain.Entities;

namespace CodeX.Infrastructure.Persistence.Configurations
{
    public class TokenConfiguration : IEntityTypeConfiguration<Token>
    {
        public void Configure(EntityTypeBuilder<Token> builder)
        {
            builder.HasKey(x => x.Id);
            builder.HasIndex(x => new { x.QueueId, x.TokenNumber });

            builder.HasOne(x => x.Queue)
                   .WithMany(x => x.Tokens)
                   .HasForeignKey(x => x.QueueId)
                   .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(x => x.Patient)
                   .WithMany(x => x.Tokens)
                   .HasForeignKey(x => x.PatientId)
                   .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
