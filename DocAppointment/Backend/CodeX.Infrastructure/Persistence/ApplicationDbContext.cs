using Microsoft.EntityFrameworkCore;
using CodeX.Domain.Entities;
using System.Reflection;
using CodeX.Application.Common.Interfaces;

namespace CodeX.Infrastructure.Persistence
{
    public class ApplicationDbContext : DbContext, IApplicationDbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<Organization> Organizations => Set<Organization>();
        public DbSet<Branch> Branches => Set<Branch>();
        public DbSet<Doctor> Doctors => Set<Doctor>();
        public DbSet<Staff> Staff => Set<Staff>();
        public DbSet<Patient> Patients => Set<Patient>();
        public DbSet<Session> Sessions => Set<Session>();
        public DbSet<DailyQueue> DailyQueues => Set<DailyQueue>();
        public DbSet<Token> Tokens => Set<Token>();
        public DbSet<Rating> Ratings => Set<Rating>();
        public DbSet<ChatSession> ChatSessions => Set<ChatSession>();
        public DbSet<MessageLog> MessageLogs => Set<MessageLog>();
        public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();
        public DbSet<Staff> Staffs => Set<Staff>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<SystemSetting>().HasKey(x => x.Key);
            modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());

            base.OnModelCreating(modelBuilder);
            
            // Global Filter for Soft Delete
            modelBuilder.Entity<Organization>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Branch>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Doctor>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Staff>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Session>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Patient>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Token>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<MessageLog>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<ChatSession>()
                .HasIndex(x => new { x.PhoneNumber, x.BranchId })
                .IsUnique();
        }
    }
}
