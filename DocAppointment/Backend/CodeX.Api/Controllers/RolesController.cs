using CodeX.Api.Authorization;
using CodeX.Application.Common.Interfaces;
using CodeX.Application.Features.Roles.Commands.CreateRole;
using CodeX.Application.Features.Roles.Commands.DeleteRole;
using CodeX.Application.Features.Roles.Commands.UpdateRole;
using CodeX.Application.Features.Roles.Queries.GetRoles;
using CodeX.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Api.Controllers
{
    [Authorize]
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/[controller]")]
    public class RolesController : BaseApiController
    {
        private readonly ICurrentUserService _currentUserService;

        public RolesController(ICurrentUserService currentUserService)
        {
            _currentUserService = currentUserService;
        }

        [HttpGet]
        [HasPermission(SystemPermissions.Settings.ManageRoles)]
        public async Task<ActionResult<List<RoleDto>>> GetRoles()
        {
            var orgId = _currentUserService.OrgId;
            var roles = await Mediator.Send(new GetRolesQuery(orgId));
            return Ok(roles);
        }



        [HttpPost]
        [HasPermission(SystemPermissions.Settings.ManageRoles)]
        public async Task<ActionResult<Guid>> CreateRole([FromBody] CreateRoleCommand command)
        {
            var orgId = _currentUserService.OrgId;

            // Override OrgId to ensure they can only create roles for their own org
            var result = await Mediator.Send(command with { OrgId = orgId });
            return Ok(result);
        }

        [HttpPut("{id}/permissions")]
        [HasPermission(SystemPermissions.Settings.ManageRoles)]
        public async Task<ActionResult> UpdateRolePermissions(Guid id, [FromBody] string[] permissions)
        {
            var orgId = _currentUserService.OrgId;
            await Mediator.Send(new UpdateRoleCommand(id, orgId, permissions));
            return NoContent();
        }

        [HttpDelete("{id}")]
        [HasPermission(SystemPermissions.Settings.ManageRoles)]
        public async Task<ActionResult> DeleteRole(Guid id)
        {
            var orgId = _currentUserService.OrgId;
            await Mediator.Send(new DeleteRoleCommand(id, orgId));
            return NoContent();
        }

        [HttpGet("permissions")]
        public ActionResult<IEnumerable<string>> GetAllAvailablePermissions()
        {
            // Optional endpoint to return all permissions for UI to render
            var permissions = SystemPermissions.GetAll();
            return Ok(permissions);
        }

        [AllowAnonymous]
        [HttpPost("sync-permissions-force")]
        public async Task<IActionResult> ForceSyncPermissions([FromServices] IApplicationDbContext context)
        {
            var allRoles = await context.Roles.IgnoreQueryFilters().ToListAsync();
            var addedCount = 0;

            foreach (var role in allRoles)
            {
                var currentPerms = await context.RolePermissions.IgnoreQueryFilters().Where(rp => rp.RoleId == role.Id).Select(rp => rp.Permission).ToListAsync();

                var permsToAdd = new List<string>();

                if (role.Name == "SuperAdmin" || role.Name == "OrgAdmin")
                {
                    if (!currentPerms.Contains("Analytics.View")) permsToAdd.Add("Analytics.View");
                    if (!currentPerms.Contains("Sessions.View")) permsToAdd.Add("Sessions.View");
                    if (!currentPerms.Contains("Sessions.Add")) permsToAdd.Add("Sessions.Add");
                    if (!currentPerms.Contains("Sessions.Edit")) permsToAdd.Add("Sessions.Edit");
                    if (!currentPerms.Contains("Sessions.Delete")) permsToAdd.Add("Sessions.Delete");
                    if (!currentPerms.Contains("DoctorDesk.View")) permsToAdd.Add("DoctorDesk.View");
                    if (!currentPerms.Contains("Branches.View")) permsToAdd.Add("Branches.View");
                    if (!currentPerms.Contains("Branches.Add")) permsToAdd.Add("Branches.Add");
                    if (!currentPerms.Contains("Branches.Edit")) permsToAdd.Add("Branches.Edit");
                    if (!currentPerms.Contains("Branches.Delete")) permsToAdd.Add("Branches.Delete");
                    if (!currentPerms.Contains("Organizations.View")) permsToAdd.Add("Organizations.View");
                    if (!currentPerms.Contains("Organizations.Edit")) permsToAdd.Add("Organizations.Edit");

                    if (!currentPerms.Contains("Pharmacy.View")) permsToAdd.Add("Pharmacy.View");
                    if (!currentPerms.Contains("Pharmacy.AddStock")) permsToAdd.Add("Pharmacy.AddStock");
                    if (!currentPerms.Contains("Pharmacy.EditStock")) permsToAdd.Add("Pharmacy.EditStock");
                    if (!currentPerms.Contains("Pharmacy.DeleteStock")) permsToAdd.Add("Pharmacy.DeleteStock");

                    if (!currentPerms.Contains("Patients.View")) permsToAdd.Add("Patients.View");
                    if (!currentPerms.Contains("Patients.ViewHistory")) permsToAdd.Add("Patients.ViewHistory");
                    if (!currentPerms.Contains("Patients.Edit")) permsToAdd.Add("Patients.Edit");
                    if (!currentPerms.Contains("Patients.Add")) permsToAdd.Add("Patients.Add");
                    if (!currentPerms.Contains("Queue.EndSession")) permsToAdd.Add("Queue.EndSession");
                    if (!currentPerms.Contains("Queue.CompleteToken")) permsToAdd.Add("Queue.CompleteToken");
                    if (!currentPerms.Contains("Queue.SkipToken")) permsToAdd.Add("Queue.SkipToken");
                    if (!currentPerms.Contains("Queue.RestoreToken")) permsToAdd.Add("Queue.RestoreToken");
                    if (!currentPerms.Contains("Queue.SendAlert")) permsToAdd.Add("Queue.SendAlert");
                    if (!currentPerms.Contains("Queue.MarkDoctorArrived")) permsToAdd.Add("Queue.MarkDoctorArrived");
                    if (!currentPerms.Contains("Queue.EditPatient")) permsToAdd.Add("Queue.EditPatient");
                    if (!currentPerms.Contains("Queue.CancelToken")) permsToAdd.Add("Queue.CancelToken");
                    if (!currentPerms.Contains("Queue.View")) permsToAdd.Add("Queue.View");
                    if (!currentPerms.Contains("Queue.AddPatient")) permsToAdd.Add("Queue.AddPatient");
                    if (!currentPerms.Contains("Queue.CallNext")) permsToAdd.Add("Queue.CallNext");
                    if (!currentPerms.Contains("Queue.CancelOfflinePatient")) permsToAdd.Add("Queue.CancelOfflinePatient");
                }
                if (role.Name == "BranchAdmin")
                {
                    if (!currentPerms.Contains("Analytics.View")) permsToAdd.Add("Analytics.View");
                    if (!currentPerms.Contains("Sessions.View")) permsToAdd.Add("Sessions.View");
                    if (!currentPerms.Contains("Sessions.Add")) permsToAdd.Add("Sessions.Add");
                    if (!currentPerms.Contains("Sessions.Edit")) permsToAdd.Add("Sessions.Edit");
                    if (!currentPerms.Contains("Sessions.Delete")) permsToAdd.Add("Sessions.Delete");
                    if (!currentPerms.Contains("Pharmacy.AddStock")) permsToAdd.Add("Pharmacy.AddStock");
                    if (!currentPerms.Contains("Pharmacy.EditStock")) permsToAdd.Add("Pharmacy.EditStock");
                    if (!currentPerms.Contains("Pharmacy.DeleteStock")) permsToAdd.Add("Pharmacy.DeleteStock");
                }
                else if (role.Name == "Doctor" || role.Name == "Receptionist")
                {
                    if (!currentPerms.Contains("Sessions.View")) permsToAdd.Add("Sessions.View");
                    if (!currentPerms.Contains("Sessions.Add")) permsToAdd.Add("Sessions.Add");
                    if (!currentPerms.Contains("Sessions.Edit")) permsToAdd.Add("Sessions.Edit");
                    if (!currentPerms.Contains("Sessions.Delete")) permsToAdd.Add("Sessions.Delete");

                    if (role.Name == "Doctor")
                    {
                        if (!currentPerms.Contains("DoctorDesk.View")) permsToAdd.Add("DoctorDesk.View");
                        if (!currentPerms.Contains("DoctorDesk.EndSession")) permsToAdd.Add("DoctorDesk.EndSession");
                        if (!currentPerms.Contains("DoctorDesk.CompleteToken")) permsToAdd.Add("DoctorDesk.CompleteToken");
                        if (!currentPerms.Contains("DoctorDesk.SkipToken")) permsToAdd.Add("DoctorDesk.SkipToken");
                        if (!currentPerms.Contains("DoctorDesk.RestoreToken")) permsToAdd.Add("DoctorDesk.RestoreToken");
                        if (!currentPerms.Contains("DoctorDesk.MarkDoctorArrived")) permsToAdd.Add("DoctorDesk.MarkDoctorArrived");
                        if (!currentPerms.Contains("DoctorDesk.CancelToken")) permsToAdd.Add("DoctorDesk.CancelToken");
                        if (!currentPerms.Contains("DoctorDesk.EditPatient")) permsToAdd.Add("DoctorDesk.EditPatient");
                        if (!currentPerms.Contains("DoctorDesk.CallNext")) permsToAdd.Add("DoctorDesk.CallNext");

                        if (!currentPerms.Contains("Patients.View")) permsToAdd.Add("Patients.View");
                        if (!currentPerms.Contains("Patients.ViewHistory")) permsToAdd.Add("Patients.ViewHistory");
                        if (!currentPerms.Contains("Patients.Edit")) permsToAdd.Add("Patients.Edit");

                        if (!currentPerms.Contains("Pharmacy.View")) permsToAdd.Add("Pharmacy.View");
                    }

                    if (role.Name == "Receptionist")
                    {
                        if (!currentPerms.Contains("Queue.View")) permsToAdd.Add("Queue.View");
                        if (!currentPerms.Contains("Queue.AddPatient")) permsToAdd.Add("Queue.AddPatient");
                        if (!currentPerms.Contains("Queue.CancelOfflinePatient")) permsToAdd.Add("Queue.CancelOfflinePatient");
                        if (!currentPerms.Contains("Queue.SendAlert")) permsToAdd.Add("Queue.SendAlert");
                        if (!currentPerms.Contains("Queue.EndSession")) permsToAdd.Add("Queue.EndSession");
                        if (!currentPerms.Contains("Queue.CompleteToken")) permsToAdd.Add("Queue.CompleteToken");
                        if (!currentPerms.Contains("Queue.SkipToken")) permsToAdd.Add("Queue.SkipToken");
                        if (!currentPerms.Contains("Queue.RestoreToken")) permsToAdd.Add("Queue.RestoreToken");
                        if (!currentPerms.Contains("Queue.MarkDoctorArrived")) permsToAdd.Add("Queue.MarkDoctorArrived");
                        if (!currentPerms.Contains("Queue.CancelToken")) permsToAdd.Add("Queue.CancelToken");
                        if (!currentPerms.Contains("Queue.EditPatient")) permsToAdd.Add("Queue.EditPatient");
                        if (!currentPerms.Contains("Queue.CallNext")) permsToAdd.Add("Queue.CallNext");

                        if (!currentPerms.Contains("Patients.View")) permsToAdd.Add("Patients.View");
                        if (!currentPerms.Contains("Patients.Add")) permsToAdd.Add("Patients.Add");
                        if (!currentPerms.Contains("Patients.Edit")) permsToAdd.Add("Patients.Edit");
                    }
                }

                foreach (var p in permsToAdd)
                {
                    context.RolePermissions.Add(new CodeX.Domain.Entities.RolePermission
                    {
                        RoleId = role.Id,
                        Permission = p
                    });
                    addedCount++;
                }

                if (role.Name == "Doctor")
                {
                    var badPerms = new[] { "Queue.View", "Queue.AddPatient", "Queue.CancelOfflinePatient" };
                    var toRemove = await context.RolePermissions.Where(rp => rp.RoleId == role.Id && badPerms.Contains(rp.Permission)).ToListAsync();
                    if (toRemove.Any())
                    {
                        context.RolePermissions.RemoveRange(toRemove);
                        addedCount += toRemove.Count; // Just to reflect changes
                    }
                }
            }

            // Cleanup orphaned SuperAdmin roles from tenants
            var orphanedSuperAdmins = await context.Roles.IgnoreQueryFilters()
                .Where(r => r.Name == "SuperAdmin" && r.OrganizationId != Guid.Empty)
                .ToListAsync();

            if (orphanedSuperAdmins.Any())
            {
                context.Roles.RemoveRange(orphanedSuperAdmins);
            }

            await context.SaveChangesAsync(default);
            return Ok(new { message = $"Forced sync of {addedCount} permissions." });
        }

        [AllowAnonymous]
        [HttpGet("test-db-roles")]
        public async Task<IActionResult> GetDbRoles([FromServices] CodeX.Infrastructure.Persistence.ApplicationDbContext context)
        {
            var roles = await context.Roles.IgnoreQueryFilters().Select(r => new { r.Name, r.IsDeleted, Permissions = context.RolePermissions.Where(rp => rp.RoleId == r.Id).Select(rp => rp.Permission).ToList() }).ToListAsync();
            return Ok(roles);
        }
    }
}
