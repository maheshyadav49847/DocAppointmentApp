using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CodeX.Application.Features.Organizations.Commands.ProvisionTenant
{
    public record ProvisionTenantCommand : IRequest<Guid>
    {
        public string Event { get; init; } = string.Empty;
        public string ApplicationKey { get; init; } = string.Empty;
        public DateTime Timestamp { get; init; }
        public ProvisionTenantData Data { get; init; } = new();
    }

    public record ProvisionTenantData
    {
        public ProvisionTenantDetails Tenant { get; init; } = new();
        public ProvisionSubscriptionDetails Subscription { get; init; } = new();
        public ProvisionPlanDetails Plan { get; init; } = new();
    }

    public record ProvisionTenantDetails
    {
        public string Id { get; init; } = string.Empty;
        public string Name { get; init; } = string.Empty;
        public string Email { get; init; } = string.Empty;
        public string Phone { get; init; } = string.Empty;
        public string PhoneCountryCode { get; init; } = "+91";
        public string PasswordHash { get; init; } = string.Empty;
    }

    public record ProvisionSubscriptionDetails
    {
        public string Id { get; init; } = string.Empty;
        public string ProviderSubscriptionId { get; init; } = string.Empty;
        public DateTime StartDate { get; init; }
        public DateTime EndDate { get; init; }
        public string Status { get; init; } = string.Empty;
    }

    public record ProvisionPlanDetails
    {
        public string Id { get; init; } = string.Empty;
        public string Name { get; init; } = string.Empty;
        public decimal MonthlyPrice { get; init; }
        public decimal YearlyPrice { get; init; }
    }

    public class ProvisionTenantCommandHandler : IRequestHandler<ProvisionTenantCommand, Guid>
    {
        private readonly IApplicationDbContext _context;

        public ProvisionTenantCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Guid> Handle(ProvisionTenantCommand request, CancellationToken cancellationToken)
        {
            if (request.Event != "subscription_created")
            {
                // Ignore other events for now, or throw error based on your preference
                return Guid.Empty;
            }

            var t = request.Data.Tenant;
            var sub = request.Data.Subscription;
            var planData = request.Data.Plan;

            var normalizedEmail = CodeX.Application.Common.Helpers.NormalizationHelper.NormalizeEmail(t.Email);
            var dc = t.PhoneCountryCode?.Replace("+", "") ?? "91";
            var normalizedPhone = CodeX.Application.Common.Helpers.NormalizationHelper.NormalizePhone(t.Phone, dc);

            // 0. Uniqueness Checks
            var emailExists = await _context.Staff.IgnoreQueryFilters().AnyAsync(s => s.Email == normalizedEmail, cancellationToken);
            if (emailExists) throw new Exception("Admin email is already registered.");

            var slug = t.Name.ToLower().Replace(" ", "-").Replace(".", "").Replace(",", ""); // auto-generate slug
            var slugExists = await _context.Organizations.IgnoreQueryFilters().AnyAsync(o => o.Slug == slug, cancellationToken);
            if (slugExists) slug = $"{slug}-{Guid.NewGuid().ToString().Substring(0, 4)}";

            // 1. Create Organization
            var org = new Organization
            {
                Name = t.Name,
                Slug = slug,
                IsActive = true
            };

            _context.Organizations.Add(org);

            // Clone system roles for the new organization
            var systemRoles = await _context.Roles
                .IgnoreQueryFilters()
                .Include(r => r.RolePermissions)
                .Where(r => r.OrganizationId == Guid.Empty && r.Name != "SuperAdmin")
                .ToListAsync(cancellationToken);

            var clonedRoles = new Dictionary<string, Role>();

            foreach (var sysRole in systemRoles)
            {
                var clonedRole = new Role
                {
                    Name = sysRole.Name,
                    Description = sysRole.Description,
                    IsSystemDefault = true,
                    OrganizationId = org.Id,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                };

                foreach (var perm in sysRole.RolePermissions)
                {
                    clonedRole.RolePermissions.Add(new RolePermission
                    {
                        Permission = perm.Permission
                    });
                }

                _context.Roles.Add(clonedRole);
                clonedRoles[clonedRole.Name] = clonedRole;
            }

            // 2. Create OrgAdmin Staff
            var orgAdminRole = clonedRoles.ContainsKey("OrgAdmin") ? clonedRoles["OrgAdmin"] : null;
            var emailParts = normalizedEmail.Split('@')[0].Split('.');

            var admin = new CodeX.Domain.Entities.Staff
            {
                OrganizationId = org.Id,
                Email = normalizedEmail,
                FirstName = emailParts.Length > 0 ? char.ToUpper(emailParts[0][0]) + emailParts[0].Substring(1) : "Admin",
                LastName = emailParts.Length > 1 ? char.ToUpper(emailParts[1][0]) + emailParts[1].Substring(1) : "User",
                PasswordHash = t.PasswordHash,
                RoleId = orgAdminRole?.Id,
                PhoneNumber = normalizedPhone,
                PhoneNumberDialCode = t.PhoneCountryCode ?? "+91",
                IsActive = true
            };

            _context.Staff.Add(admin);

            // 3. Setup Subscription Plan
            if (!string.IsNullOrEmpty(planData.Name))
            {
                var plan = await _context.SubscriptionPlans.FirstOrDefaultAsync(p => p.Name == planData.Name, cancellationToken);
                
                if (plan == null)
                {
                    plan = new SubscriptionPlan
                    {
                        Name = planData.Name,
                        Price = planData.MonthlyPrice,
                        Currency = "INR",
                        IntervalDays = (sub.EndDate - sub.StartDate).Days > 0 ? (sub.EndDate - sub.StartDate).Days : 30,
                        MaxBranches = 1,
                        MaxDoctors = 5,
                        MaxStaff = 10,
                        MaxPatientsPerMonth = 1000
                    };
                    _context.SubscriptionPlans.Add(plan);
                }

                // 4. Create Organization Subscription
                var subscription = new OrganizationSubscription
                {
                    OrganizationId = org.Id,
                    SubscriptionPlan = plan,
                    RazorpaySubscriptionId = sub.ProviderSubscriptionId,
                    StartDate = sub.StartDate,
                    EndDate = sub.EndDate,
                    Status = sub.Status
                };

                _context.OrganizationSubscriptions.Add(subscription);
            }

            await _context.SaveChangesAsync(cancellationToken);

            return org.Id;
        }
    }
}
