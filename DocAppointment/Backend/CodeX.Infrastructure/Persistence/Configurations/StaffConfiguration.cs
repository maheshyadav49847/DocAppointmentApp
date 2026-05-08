using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using CodeX.Domain.Entities;

namespace CodeX.Infrastructure.Persistence.Configurations
{
    public class StaffConfiguration : IEntityTypeConfiguration<Staff>
    {
        public void Configure(EntityTypeBuilder<Staff> builder)
        {
            builder.HasKey(x => x.Id);
            builder.Property(x => x.Email).IsRequired().HasMaxLength(255);
            builder.HasIndex(x => x.Email);

            builder.HasOne(x => x.Organization)
                   .WithMany()
                   .HasForeignKey(x => x.OrganizationId)
                   .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(x => x.Branch)
                   .WithMany()
                   .HasForeignKey(x => x.BranchId)
                   .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
