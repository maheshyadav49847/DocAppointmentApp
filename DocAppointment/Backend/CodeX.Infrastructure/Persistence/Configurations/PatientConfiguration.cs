using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using CodeX.Domain.Entities;

namespace CodeX.Infrastructure.Persistence.Configurations
{
    public class PatientConfiguration : IEntityTypeConfiguration<Patient>
    {
        public void Configure(EntityTypeBuilder<Patient> builder)
        {
            builder.HasKey(x => x.Id);
            builder.Property(x => x.Phone).IsRequired().HasMaxLength(20);
            builder.HasIndex(x => x.Phone).IsUnique().HasFilter("\"IsDeleted\" = false");
        }
    }
}
