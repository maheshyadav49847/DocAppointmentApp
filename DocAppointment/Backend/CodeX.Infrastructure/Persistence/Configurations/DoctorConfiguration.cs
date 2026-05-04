using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using CodeX.Domain.Entities;

namespace CodeX.Infrastructure.Persistence.Configurations
{
    public class DoctorConfiguration : IEntityTypeConfiguration<Doctor>
    {
        public void Configure(EntityTypeBuilder<Doctor> builder)
        {
            builder.HasKey(x => x.Id);
            builder.Property(x => x.Name).IsRequired().HasMaxLength(255);
            builder.Property(x => x.RegistrationNumber).HasMaxLength(50);
            builder.HasIndex(x => x.RegistrationNumber).IsUnique().HasFilter("\"RegistrationNumber\" IS NOT NULL");

            builder.HasOne(x => x.Branch)
                   .WithMany(x => x.Doctors)
                   .HasForeignKey(x => x.BranchId)
                   .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
