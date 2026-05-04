using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using CodeX.Domain.Entities;

namespace CodeX.Infrastructure.Persistence.Configurations
{
    public class DailyQueueConfiguration : IEntityTypeConfiguration<DailyQueue>
    {
        public void Configure(EntityTypeBuilder<DailyQueue> builder)
        {
            builder.HasKey(x => x.Id);
            builder.HasIndex(x => new { x.DoctorId, x.QueueDate, x.SessionId }).IsUnique();

            builder.HasOne(x => x.Doctor)
                   .WithMany(x => x.DailyQueues)
                   .HasForeignKey(x => x.DoctorId)
                   .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(x => x.Branch)
                   .WithMany(x => x.DailyQueues)
                   .HasForeignKey(x => x.BranchId)
                   .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
