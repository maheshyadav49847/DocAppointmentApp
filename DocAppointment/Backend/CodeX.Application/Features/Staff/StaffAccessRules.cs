using CodeX.Application.Common.Interfaces;

namespace CodeX.Application.Features.Staff
{
    internal static class StaffAccessRules
    {
        public static Guid ResolveOrganizationId(ICurrentUserService currentUser, Guid requestedOrganizationId)
        {
            if (currentUser.OrgId == Guid.Empty)
            {
                return requestedOrganizationId != Guid.Empty ? requestedOrganizationId : currentUser.OrgId;
            }

            return currentUser.OrgId;
        }

        public static Guid? ResolveBranchId(ICurrentUserService currentUser, Guid? requestedBranchId)
        {
            if (requestedBranchId == Guid.Empty)
            {
                requestedBranchId = null;
            }

            if (currentUser.OrgId == Guid.Empty || !currentUser.BranchId.HasValue)
            {
                return requestedBranchId;
            }

            if (requestedBranchId.HasValue && requestedBranchId != currentUser.BranchId)
            {
                throw new Exception("Branch-level staff can only manage staff in their own branch.");
            }

            return currentUser.BranchId.Value;
        }

        public static void EnsureCanAssignRole(ICurrentUserService currentUser, string targetRoleName)
        {
            // Allowed via Controller [HasPermission] attributes
        }

        public static void EnsureRoleMatchesBranchScope(Guid? branchId, string roleName)
        {
            // Allowed via Controller [HasPermission] attributes and flexible dynamic roles
        }

        public static void EnsureCanManageTarget(ICurrentUserService currentUser, Domain.Entities.Staff targetStaff)
        {
            if (currentUser.OrgId == Guid.Empty)
            {
                return;
            }

            if (targetStaff.OrganizationId != currentUser.OrgId)
            {
                throw new Exception("You cannot manage staff outside your organization.");
            }

            if (currentUser.BranchId.HasValue)
            {
                if (targetStaff.BranchId != currentUser.BranchId)
                {
                    throw new Exception("Branch-level staff can only manage staff in their own branch.");
                }
            }
        }
    }
}
