using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using CodeX.Domain.Entities;

namespace CodeX.Infrastructure.Persistence.Configurations
{
    public class PatientVisitConfiguration : IEntityTypeConfiguration<PatientVisit>
    {
        public void Configure(EntityTypeBuilder<PatientVisit> builder)
        {
            builder.HasKey(x => x.Id);
            
            builder.HasOne(x => x.Patient)
                .WithMany(p => p.Visits)
                .HasForeignKey(x => x.PatientId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(x => x.Doctor)
                .WithMany()
                .HasForeignKey(x => x.DoctorId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(x => x.Token)
                .WithMany()
                .HasForeignKey(x => x.TokenId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}
