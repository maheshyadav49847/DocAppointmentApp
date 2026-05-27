using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using CodeX.Domain.Entities;

namespace CodeX.Infrastructure.Persistence.Configurations
{
    public class VisitMedicineConfiguration : IEntityTypeConfiguration<VisitMedicine>
    {
        public void Configure(EntityTypeBuilder<VisitMedicine> builder)
        {
            builder.HasKey(x => x.Id);
            builder.Property(x => x.MedicineName).IsRequired().HasMaxLength(150);
            builder.Property(x => x.Dosage).IsRequired().HasMaxLength(100);
            builder.Property(x => x.MedicineType).HasMaxLength(50);
            builder.Property(x => x.DoseQty).HasMaxLength(50);
            builder.Property(x => x.DoseSchedule).HasMaxLength(50);
            builder.Property(x => x.FoodTiming).HasMaxLength(50);
            builder.Property(x => x.CourseDuration).HasMaxLength(50);
            builder.Property(x => x.ClinicalInstructions).HasMaxLength(250);

            builder.HasOne(x => x.PatientVisit)
                .WithMany(pv => pv.Medicines)
                .HasForeignKey(x => x.PatientVisitId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
