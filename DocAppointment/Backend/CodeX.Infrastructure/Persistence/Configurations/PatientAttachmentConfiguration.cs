using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using CodeX.Domain.Entities;

namespace CodeX.Infrastructure.Persistence.Configurations
{
    public class PatientAttachmentConfiguration : IEntityTypeConfiguration<PatientAttachment>
    {
        public void Configure(EntityTypeBuilder<PatientAttachment> builder)
        {
            builder.HasKey(x => x.Id);
            builder.Property(x => x.FileName).IsRequired().HasMaxLength(255);
            builder.Property(x => x.Category).IsRequired().HasMaxLength(50);
            builder.Property(x => x.FileUrl).IsRequired().HasMaxLength(1000);

            builder.HasOne(x => x.Patient)
                .WithMany(p => p.Attachments)
                .HasForeignKey(x => x.PatientId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
