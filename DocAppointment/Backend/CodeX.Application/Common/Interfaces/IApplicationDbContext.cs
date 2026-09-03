using Microsoft.EntityFrameworkCore;
using CodeX.Domain.Entities;

namespace CodeX.Application.Common.Interfaces
{
    public interface IApplicationDbContext
    {
        DbSet<Organization> Organizations { get; }
        DbSet<Role> Roles { get; }
        DbSet<RolePermission> RolePermissions { get; }
        DbSet<Branch> Branches { get; }
        DbSet<Doctor> Doctors { get; }
        DbSet<Staff> Staff { get; }
        DbSet<ApplicationSetting> ApplicationSettings { get; }
        DbSet<Patient> Patients { get; }
        DbSet<Session> Sessions { get; }
        DbSet<DailyQueue> DailyQueues { get; }
        DbSet<Token> Tokens { get; }
        DbSet<Rating> Ratings { get; }
        DbSet<ChatSession> ChatSessions { get; }
        DbSet<MessageLog> MessageLogs { get; }
        DbSet<Staff> Staffs { get; }
        DbSet<PatientVisit> PatientVisits { get; }
        DbSet<VisitMedicine> VisitMedicines { get; }
        DbSet<VisitService> VisitServices { get; }
        DbSet<MedicineMaster> Medicines { get; }
        DbSet<MedicineType> MedicineTypes { get; }
        DbSet<PatientAttachment> PatientAttachments { get; }
        DbSet<FollowUp> FollowUps { get; }
        DbSet<Notification> Notifications { get; }
        DbSet<SubscriptionPlan> SubscriptionPlans { get; }
        DbSet<OrganizationSubscription> OrganizationSubscriptions { get; }
        DbSet<AuditLog> AuditLogs { get; }
        DbSet<UserSession> UserSessions { get; }
        DbSet<RefreshToken> RefreshTokens { get; }
        DbSet<IdempotencyLog> IdempotencyLogs { get; }
        DbSet<Country> Countries { get; }
        DbSet<ServiceItem> ServiceItems { get; }
        DbSet<Invoice> Invoices { get; }
        DbSet<InvoiceItem> InvoiceItems { get; }
        DbSet<Payment> Payments { get; }

        Task<int> SaveChangesAsync(CancellationToken cancellationToken);
    }
}
