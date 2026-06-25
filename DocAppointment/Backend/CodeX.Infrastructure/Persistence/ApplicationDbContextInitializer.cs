using CodeX.Domain.Entities;
using CodeX.Domain.Constants;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace CodeX.Infrastructure.Persistence
{
    public static class ApplicationDbContextInitializer
    {
        public static async Task SeedAsync(IServiceProvider serviceProvider)
        {
            using var scope = serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("ApplicationDbContextInitializer");

            try
            {
                if (context.Database.IsNpgsql())
                {
                    await context.Database.MigrateAsync();
                }

                await SeedRolesAsync(context);
                await AssignRolesToExistingStaffAsync(context);
                await MigrateTenantRolesAsync(context);
                await SyncOrgAdminPermissionsAsync(context);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "An error occurred while seeding the database.");
                throw;
            }
        }

        private static async Task SeedRolesAsync(ApplicationDbContext context)
        {
            // Ensure a dummy organization with Guid.Empty exists for system roles
            var systemOrg = await context.Organizations.IgnoreQueryFilters().FirstOrDefaultAsync(o => o.Id == Guid.Empty);
            if (systemOrg == null)
            {
                await context.Database.ExecuteSqlRawAsync(
                    "INSERT INTO \"Organizations\" (\"Id\", \"Name\", \"Slug\", \"SettingsJson\", \"CreatedAt\", \"IsActive\", \"IsDeleted\") " +
                    "VALUES ('00000000-0000-0000-0000-000000000000', 'System Default Organization', 'system-default', '{{}}', NOW(), true, false) " +
                    "ON CONFLICT (\"Id\") DO NOTHING;");
            }

            var allPerms = SystemPermissions.GetAll().ToArray();

            var systemRoles = new List<(string Name, string Description, string[] Permissions)>
            {
                ("SuperAdmin", "System Administrator with full access to everything", allPerms),
                ("OrgAdmin", "Organization Administrator with full access within their organization", allPerms),
                ("BranchAdmin", "Branch Administrator with access limited to their branch", new[]
                {
                    SystemPermissions.Queue.View, SystemPermissions.Queue.AddPatient, SystemPermissions.Queue.CallNext, 
                    SystemPermissions.Queue.EndSession, SystemPermissions.Queue.CompleteToken, SystemPermissions.Queue.SkipToken, 
                    SystemPermissions.Queue.RestoreToken, SystemPermissions.Queue.SendAlert, SystemPermissions.Queue.MarkDoctorArrived, 
                    SystemPermissions.Queue.EditPatient, SystemPermissions.Queue.CancelToken, SystemPermissions.Queue.CancelOfflinePatient,
                    SystemPermissions.Sessions.View, SystemPermissions.Sessions.Add, SystemPermissions.Sessions.Edit, SystemPermissions.Sessions.Delete,
                    SystemPermissions.Patients.View, SystemPermissions.Patients.Add, SystemPermissions.Patients.Edit, SystemPermissions.Patients.Delete, SystemPermissions.Patients.ViewHistory,
                    SystemPermissions.Staff.View, SystemPermissions.Staff.Add, SystemPermissions.Staff.Edit,
                    SystemPermissions.Doctors.View, SystemPermissions.Doctors.Add, SystemPermissions.Doctors.Edit,
                    SystemPermissions.Pharmacy.View, SystemPermissions.Pharmacy.AddStock, SystemPermissions.Pharmacy.EditStock, SystemPermissions.Pharmacy.DeleteStock, SystemPermissions.Pharmacy.GenerateBills,
                    SystemPermissions.Analytics.View
                }),
                ("Doctor", "Doctor access to view their own queue and patient details", new[]
                {
                    SystemPermissions.Queue.View, SystemPermissions.Queue.CallNext, 
                    SystemPermissions.Queue.CompleteToken, SystemPermissions.Queue.SkipToken, SystemPermissions.Queue.RestoreToken,
                    SystemPermissions.Sessions.View, SystemPermissions.Sessions.Add, SystemPermissions.Sessions.Edit, SystemPermissions.Sessions.Delete,
                    SystemPermissions.Patients.View, SystemPermissions.Patients.ViewHistory, SystemPermissions.DoctorDesk.View,
                    SystemPermissions.Doctors.View
                }),
                ("Receptionist", "Receptionist access to manage queue and register patients", new[]
                {
                    SystemPermissions.Queue.View, SystemPermissions.Queue.AddPatient, SystemPermissions.Queue.CallNext, 
                    SystemPermissions.Queue.CompleteToken, SystemPermissions.Queue.SkipToken, SystemPermissions.Queue.RestoreToken, 
                    SystemPermissions.Queue.SendAlert, SystemPermissions.Queue.MarkDoctorArrived, SystemPermissions.Queue.EditPatient, 
                    SystemPermissions.Queue.CancelToken, SystemPermissions.Queue.CancelOfflinePatient,
                    SystemPermissions.Sessions.View, SystemPermissions.Sessions.Add, SystemPermissions.Sessions.Edit, SystemPermissions.Sessions.Delete,
                    SystemPermissions.Patients.View, SystemPermissions.Patients.Add, SystemPermissions.Patients.Edit,
                    SystemPermissions.Doctors.View
                }),
            };

            var existingRoles = await context.Roles.Where(r => r.OrganizationId == Guid.Empty).ToListAsync();
            
            foreach (var roleData in systemRoles)
            {
                var role = existingRoles.FirstOrDefault(r => r.Name == roleData.Name);
                if (role == null)
                {
                    role = new Role
                    {
                        Id = Guid.NewGuid(),
                        Name = roleData.Name,
                        Description = roleData.Description,
                        IsSystemDefault = true,
                        OrganizationId = Guid.Empty, // System roles belong to no specific org
                        CreatedAt = DateTime.UtcNow,
                        IsActive = true
                    };
                    context.Roles.Add(role);

                    foreach (var permission in roleData.Permissions)
                    {
                        context.RolePermissions.Add(new RolePermission
                        {
                            RoleId = role.Id,
                            Permission = permission
                        });
                    }
                }
                else
                {
                    var existingPerms = await context.RolePermissions.Where(rp => rp.RoleId == role.Id).Select(rp => rp.Permission).ToListAsync();
                    var missingPerms = roleData.Permissions.Except(existingPerms);
                    foreach (var permission in missingPerms)
                    {
                        context.RolePermissions.Add(new RolePermission
                        {
                            RoleId = role.Id,
                            Permission = permission
                        });
                    }
                }
            }

            // HARD Delete deprecated roles physically from database
            var deprecatedRoles = new[] { "Nurse", "Pharmacist", "Cashier" };
            await context.Roles
                .IgnoreQueryFilters()
                .Where(r => deprecatedRoles.Contains(r.Name) && r.OrganizationId == Guid.Empty)
                .ExecuteDeleteAsync();

            await context.SaveChangesAsync();
        }

        private static async Task AssignRolesToExistingStaffAsync(ApplicationDbContext context)
        {
            var unassignedStaff = await context.Staffs.IgnoreQueryFilters().Where(s => s.RoleId == null).ToListAsync();
            if (!unassignedStaff.Any())
                return;

            var roles = await context.Roles.Where(r => r.OrganizationId == Guid.Empty).ToListAsync();
            var superAdminRole = roles.First(r => r.Name == "SuperAdmin");
            var orgAdminRole = roles.First(r => r.Name == "OrgAdmin");
            var branchAdminRole = roles.First(r => r.Name == "BranchAdmin");
            var doctorRole = roles.First(r => r.Name == "Doctor");
            var receptionistRole = roles.First(r => r.Name == "Receptionist");

            foreach (var staff in unassignedStaff)
            {
                if (staff.Email == "admin@codex.com" || staff.OrganizationId == Guid.Empty)
                {
                    staff.RoleId = superAdminRole.Id;
                }
                else if (staff.DoctorId.HasValue)
                {
                    staff.RoleId = doctorRole.Id;
                }
                else if (!staff.BranchId.HasValue)
                {
                    staff.RoleId = orgAdminRole.Id;
                }
                else
                {
                    // Default to Receptionist for branch-level staff without a specific designation
                    staff.RoleId = receptionistRole.Id;
                }
            }

            await context.SaveChangesAsync();
        }
        private static async Task MigrateTenantRolesAsync(ApplicationDbContext context)
        {
            var orgs = await context.Organizations
                .IgnoreQueryFilters()
                .Where(o => o.Id != Guid.Empty)
                .ToListAsync();

            var systemRoles = await context.Roles
                .Include(r => r.RolePermissions)
                .Where(r => r.OrganizationId == Guid.Empty)
                .ToListAsync();

            foreach (var org in orgs)
            {
                var orgHasSystemRoles = await context.Roles
                    .IgnoreQueryFilters()
                    .AnyAsync(r => r.OrganizationId == org.Id && r.IsSystemDefault);

                if (!orgHasSystemRoles)
                {
                    var oldRoleToNewRoleMap = new Dictionary<Guid, Guid>();

                    foreach (var sysRole in systemRoles)
                    {
                        var clonedRole = new Role
                        {
                            Id = Guid.NewGuid(),
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
                                RoleId = clonedRole.Id,
                                Permission = perm.Permission
                            });
                        }

                        context.Roles.Add(clonedRole);
                        oldRoleToNewRoleMap[sysRole.Id] = clonedRole.Id;
                    }

                    var orgStaff = await context.Staffs
                        .IgnoreQueryFilters()
                        .Where(s => s.OrganizationId == org.Id && s.RoleId != null)
                        .ToListAsync();

                    foreach (var staff in orgStaff)
                    {
                        if (staff.RoleId.HasValue && oldRoleToNewRoleMap.TryGetValue(staff.RoleId.Value, out var newRoleId))
                        {
                            staff.RoleId = newRoleId;
                        }
                    }
                }
            }

            await context.SaveChangesAsync();
        }

        private static async Task SyncOrgAdminPermissionsAsync(ApplicationDbContext context)
        {
            var allPerms = SystemPermissions.GetAll().ToArray();
            
            var orgAdminRoles = await context.Roles
                .IgnoreQueryFilters()
                .Include(r => r.RolePermissions)
                .Where(r => r.Name == "OrgAdmin" || r.Name == "SuperAdmin")
                .ToListAsync();

            bool anyChanges = false;
            foreach (var role in orgAdminRoles)
            {
                var existingPerms = role.RolePermissions.Select(rp => rp.Permission).ToHashSet();
                foreach (var perm in allPerms)
                {
                    if (!existingPerms.Contains(perm))
                    {
                        role.RolePermissions.Add(new RolePermission
                        {
                            RoleId = role.Id,
                            Permission = perm
                        });
                        anyChanges = true;
                    }
                }
            }

            if (anyChanges)
            {
                await context.SaveChangesAsync();
            }
        }
    }
}
