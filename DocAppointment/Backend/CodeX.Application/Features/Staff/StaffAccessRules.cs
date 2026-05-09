using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using CodeX.Domain.Enums;

namespace CodeX.Application.Features.Staff
{
    internal static class StaffAccessRules
    {
        public static Guid ResolveOrganizationId(ICurrentUserService currentUser, Guid requestedOrganizationId)
        {
            if (currentUser.IsInRole(nameof(StaffRole.SuperAdmin)))
            {
                return requestedOrganizationId != Guid.Empty ? requestedOrganizationId : currentUser.OrgId;
            }

            if (currentUser.OrgId == Guid.Empty)
            {
                throw new Exception("Your account is not linked to an organization.");
            }

            return currentUser.OrgId;
        }

        public static Guid? ResolveBranchId(ICurrentUserService currentUser, Guid? requestedBranchId)
        {
            if (requestedBranchId == Guid.Empty)
            {
                requestedBranchId = null;
            }

            if (currentUser.IsInRole(nameof(StaffRole.SuperAdmin)) || currentUser.IsInRole(nameof(StaffRole.OrgAdmin)))
            {
                return requestedBranchId;
            }

            if (currentUser.IsInRole(nameof(StaffRole.BranchAdmin)))
            {
                if (!currentUser.BranchId.HasValue)
                {
                    throw new Exception("Your account is not linked to a branch.");
                }

                if (requestedBranchId.HasValue && requestedBranchId != currentUser.BranchId)
                {
                    throw new Exception("Branch admins can only manage staff in their own branch.");
                }

                return currentUser.BranchId.Value;
            }

            throw new Exception("You do not have permission to manage staff.");
        }

        public static void EnsureCanAssignRole(ICurrentUserService currentUser, StaffRole targetRole)
        {
            if (currentUser.IsInRole(nameof(StaffRole.SuperAdmin)))
            {
                return;
            }

            if (targetRole == StaffRole.SuperAdmin)
            {
                throw new Exception("Only super admins can assign the SuperAdmin role.");
            }

            if (currentUser.IsInRole(nameof(StaffRole.BranchAdmin)) &&
                targetRole is StaffRole.OrgAdmin or StaffRole.BranchAdmin)
            {
                throw new Exception("Branch admins can only create or update receptionist and doctor accounts.");
            }
        }

        public static void EnsureRoleMatchesBranchScope(Guid? branchId, StaffRole role)
        {
            if (!branchId.HasValue && role is not StaffRole.OrgAdmin and not StaffRole.SuperAdmin)
            {
                throw new Exception("Organization-level staff must be OrgAdmin or SuperAdmin.");
            }

            if (branchId.HasValue && role == StaffRole.OrgAdmin)
            {
                throw new Exception("OrgAdmin accounts cannot be assigned to a specific branch.");
            }
        }

        public static void EnsureCanManageTarget(ICurrentUserService currentUser, Domain.Entities.Staff targetStaff)
        {
            if (currentUser.IsInRole(nameof(StaffRole.SuperAdmin)))
            {
                return;
            }

            if (targetStaff.OrganizationId != currentUser.OrgId)
            {
                throw new Exception("You cannot manage staff outside your organization.");
            }

            if (targetStaff.Role == StaffRole.SuperAdmin)
            {
                throw new Exception("Only super admins can manage SuperAdmin accounts.");
            }

            if (currentUser.IsInRole(nameof(StaffRole.BranchAdmin)))
            {
                if (!currentUser.BranchId.HasValue || targetStaff.BranchId != currentUser.BranchId)
                {
                    throw new Exception("Branch admins can only manage staff in their own branch.");
                }

                if (targetStaff.Role is StaffRole.OrgAdmin or StaffRole.BranchAdmin)
                {
                    throw new Exception("Branch admins cannot manage other admin accounts.");
                }
            }
        }
    }
}
