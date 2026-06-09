using CodeX.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CodeX.Infrastructure.Persistence.Configurations
{
    public class MedicineMasterConfiguration : IEntityTypeConfiguration<MedicineMaster>
    {
        public void Configure(EntityTypeBuilder<MedicineMaster> builder)
        {
            builder.ToTable("Medicines");

            builder.HasKey(m => m.Id);

            builder.Property(m => m.Name)
                .IsRequired()
                .HasMaxLength(200);

            builder.Property(m => m.GenericName)
                .HasMaxLength(300);

            builder.Property(m => m.Type)
                .HasMaxLength(100);

            builder.Property(m => m.Manufacturer)
                .HasMaxLength(200);


            builder.HasOne(m => m.Organization)
                .WithMany()
                .HasForeignKey(m => m.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
