using Microsoft.EntityFrameworkCore;
using CodeX.Domain.Entities;
using System.Reflection;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Common;
using Microsoft.Extensions.Configuration;
using CodeX.Infrastructure.Persistence.Converters;

namespace CodeX.Infrastructure.Persistence
{
    public class ApplicationDbContext : DbContext, IApplicationDbContext
    {
        private readonly ICurrentUserService _currentUserService;
        private readonly IConfiguration _configuration;

        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options, ICurrentUserService currentUserService, IConfiguration configuration)
            : base(options)
        {
            _currentUserService = currentUserService;
            _configuration = configuration;
        }

        public DbSet<Organization> Organizations => Set<Organization>();
        public DbSet<Role> Roles => Set<Role>();
        public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
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
        public DbSet<ApplicationSetting> ApplicationSettings => Set<ApplicationSetting>();
        public DbSet<Country> Countries => Set<Country>();
        public DbSet<Staff> Staffs => Set<Staff>();
        public DbSet<PatientVisit> PatientVisits => Set<PatientVisit>();
        public DbSet<VisitMedicine> VisitMedicines => Set<VisitMedicine>();
        public DbSet<VisitService> VisitServices => Set<VisitService>();
        public DbSet<MedicineMaster> Medicines => Set<MedicineMaster>();
        public DbSet<MedicineType> MedicineTypes => Set<MedicineType>();
        public DbSet<PatientAttachment> PatientAttachments => Set<PatientAttachment>();
        public DbSet<FollowUp> FollowUps => Set<FollowUp>();
        public DbSet<Notification> Notifications => Set<Notification>();
        public DbSet<SubscriptionPlan> SubscriptionPlans => Set<SubscriptionPlan>();
        public DbSet<OrganizationSubscription> OrganizationSubscriptions => Set<OrganizationSubscription>();
        public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
        public DbSet<UserSession> UserSessions => Set<UserSession>();
        public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
        public DbSet<IdempotencyLog> IdempotencyLogs => Set<IdempotencyLog>();
        
        public DbSet<ServiceItem> ServiceItems => Set<ServiceItem>();
        public DbSet<Invoice> Invoices => Set<Invoice>();
        public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();
        public DbSet<Payment> Payments => Set<Payment>();

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            var userIdStr = _currentUserService.UserId;
            Guid? userId = null;
            if (Guid.TryParse(userIdStr, out var parsedId))
            {
                userId = parsedId;
            }

            foreach (var entry in ChangeTracker.Entries<BaseEntity>())
            {
                switch (entry.State)
                {
                    case EntityState.Added:
                        entry.Entity.CreatedBy = userId;
                        entry.Entity.CreatedAt = DateTime.UtcNow;
                        entry.Entity.IsActive = true;
                        entry.Entity.IsDeleted = false;

                        if (entry.Entity is IMustHaveTenant tenantEntity && tenantEntity.OrganizationId == Guid.Empty)
                        {
                            tenantEntity.OrganizationId = _currentUserService.OrgId;
                        }
                        
                        if (entry.Entity is IMustHaveBranch branchEntity && branchEntity.BranchId == null)
                        {
                            branchEntity.BranchId = _currentUserService.BranchId;
                        }
                        break;

                    case EntityState.Modified:
                        entry.Entity.UpdatedBy = userId;
                        entry.Entity.UpdatedAt = DateTime.UtcNow;
                        break;
                        
                    case EntityState.Deleted:
                        // Implement Soft Delete
                        entry.State = EntityState.Modified;
                        entry.Entity.UpdatedBy = userId;
                        entry.Entity.UpdatedAt = DateTime.UtcNow;
                        entry.Entity.IsDeleted = true;
                        entry.Entity.IsActive = false;
                        break;
                }
            }

            return await base.SaveChangesAsync(cancellationToken);
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<ApplicationSetting>().HasKey(x => x.Id);
            
            modelBuilder.Entity<RolePermission>()
                .HasKey(rp => new { rp.RoleId, rp.Permission });

            modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());

            base.OnModelCreating(modelBuilder);
            
            // Apply Global Query Filters dynamically
            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                if (typeof(IMustHaveTenant).IsAssignableFrom(entityType.ClrType))
                {
                    var method = typeof(ApplicationDbContext).GetMethod(nameof(ApplyTenantFilter), BindingFlags.NonPublic | BindingFlags.Instance)
                        ?.MakeGenericMethod(entityType.ClrType);
                    method?.Invoke(this, new object[] { modelBuilder });
                }
                else if (typeof(CodeX.Domain.Common.BaseEntity).IsAssignableFrom(entityType.ClrType))
                {
                    var method = typeof(ApplicationDbContext).GetMethod(nameof(ApplySoftDeleteFilter), BindingFlags.NonPublic | BindingFlags.Instance)
                        ?.MakeGenericMethod(entityType.ClrType);
                    method?.Invoke(this, new object[] { modelBuilder });
                }
            }

            modelBuilder.Entity<ChatSession>()
                .HasIndex(x => new { x.PhoneNumber, x.BranchId })
                .IsUnique();

            // Indexes for Search Performance
            modelBuilder.Entity<Patient>()
                .HasIndex(p => p.Phone);
            modelBuilder.Entity<Patient>()
                .HasIndex(p => p.Name);

            // Apply Encryption Converter
            var encryptionKey = _configuration["EncryptionSettings:Key"];
            if (!string.IsNullOrEmpty(encryptionKey) && encryptionKey.Length >= 32)
            {
                var converter = new EncryptedStringConverter(encryptionKey);
                
                modelBuilder.Entity<Patient>()
                    .Property(p => p.Phone)
                    .HasConversion(converter);
                    
                modelBuilder.Entity<Patient>()
                    .Property(p => p.AadhaarNumber)
                    .HasConversion(converter);
            }

            // Doctor Data Isolation Filters
            modelBuilder.Entity<Doctor>().HasQueryFilter(x =>
                _currentUserService.OrgId != Guid.Empty && x.OrganizationId == _currentUserService.OrgId 
                && (!IsDoctorRole || x.Id == CurrentDoctorId)
                && !x.IsDeleted
            );

            modelBuilder.Entity<Session>().HasQueryFilter(x =>
                (_currentUserService.OrgId == Guid.Empty || x.Branch.OrganizationId == _currentUserService.OrgId)
                && (!IsDoctorRole || x.DoctorId == CurrentDoctorId)
                && !x.IsDeleted
            );

            modelBuilder.Entity<DailyQueue>().HasQueryFilter(x =>
                (_currentUserService.OrgId == Guid.Empty || x.Branch.OrganizationId == _currentUserService.OrgId)
                && (!IsDoctorRole || x.DoctorId == CurrentDoctorId)
                && !x.IsDeleted
            );

            // Additional Navigation-Based Isolation Filters for Entities missing IMustHaveTenant
            modelBuilder.Entity<MessageLog>().HasQueryFilter(x => 
                (_currentUserService.OrgId == Guid.Empty || x.Branch.OrganizationId == _currentUserService.OrgId) && !x.IsDeleted);
            
            modelBuilder.Entity<ChatSession>().HasQueryFilter(x => 
                _currentUserService.OrgId == Guid.Empty || (x.Branch != null && x.Branch.OrganizationId == _currentUserService.OrgId));

            modelBuilder.Entity<Rating>().HasQueryFilter(x => 
                (_currentUserService.OrgId == Guid.Empty || (x.Token != null && x.Token.OrganizationId == _currentUserService.OrgId)) && !x.IsDeleted);
        }

        private bool IsDoctorRole => _currentUserService.IsInRole("Doctor");
        private Guid? CurrentDoctorId => _currentUserService.DoctorId;

        private void ApplyTenantFilter<T>(ModelBuilder builder) where T : class, IMustHaveTenant
        {
            // Combines IMustHaveTenant and SoftDelete logic
            // Since EF Core evaluates Global Query Filters at runtime, we must capture the service resolution dynamically
            builder.Entity<T>().HasQueryFilter(x => 
                _currentUserService.OrgId != Guid.Empty && x.OrganizationId == _currentUserService.OrgId 
                && !((CodeX.Domain.Common.BaseEntity)(object)x).IsDeleted);
        }

        private void ApplySoftDeleteFilter<T>(ModelBuilder builder) where T : CodeX.Domain.Common.BaseEntity
        {
            builder.Entity<T>().HasQueryFilter(x => !x.IsDeleted);
        }
    }
}
