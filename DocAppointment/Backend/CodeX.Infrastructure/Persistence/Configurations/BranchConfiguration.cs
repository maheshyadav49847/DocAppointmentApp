using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using CodeX.Domain.Entities;

namespace CodeX.Infrastructure.Persistence.Configurations
{
    public class BranchConfiguration : IEntityTypeConfiguration<Branch>
    {
        public void Configure(EntityTypeBuilder<Branch> builder)
        {
            builder.HasKey(x => x.Id);
            builder.Property(x => x.Name).IsRequired().HasMaxLength(255);
            builder.Property(x => x.WhatsAppNumber).IsRequired().HasMaxLength(50);
            builder.HasIndex(x => x.WhatsAppNumber).IsUnique().HasFilter("\"IsDeleted\" = false");

            builder.HasOne(x => x.Organization)
                   .WithMany(x => x.Branches)
                   .HasForeignKey(x => x.OrganizationId)
                   .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
