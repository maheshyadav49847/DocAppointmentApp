using CodeX.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CodeX.Infrastructure.Persistence.Configurations
{
    public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
    {
        public void Configure(EntityTypeBuilder<Notification> builder)
        {
            builder.HasKey(t => t.Id);

            builder.Property(t => t.Title)
                .IsRequired()
                .HasMaxLength(200);

            builder.Property(t => t.Message)
                .IsRequired()
                .HasMaxLength(1000);

            builder.Property(t => t.Type)
                .HasMaxLength(50);

            builder.HasIndex(t => t.BranchId);
            builder.HasIndex(t => t.OrganizationId);
            builder.HasIndex(t => t.UserId);
        }
    }
}
