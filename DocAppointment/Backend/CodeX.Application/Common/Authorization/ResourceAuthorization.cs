using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using CodeX.Domain.Enums;

namespace CodeX.Application.Common.Authorization
{
    public static class ResourceAuthorization
    {
        public static void EnsureOrgOwnership(ICurrentUserService currentUser, Guid orgId)
        {
            if (currentUser.IsInRole(nameof(StaffRole.SuperAdmin))) return;
            
            if (orgId == Guid.Empty || orgId != currentUser.OrgId)
            {
                throw new UnauthorizedAccessException("You do not have access to this organization's resources.");
            }
        }

        public static void EnsureBranchOwnership(ICurrentUserService currentUser, Guid branchId)
        {
            if (currentUser.IsInRole(nameof(StaffRole.SuperAdmin))) return;

            // If user is OrgAdmin, they just need to own the org
            // But if they are BranchAdmin or Receptionist, they must match the branch
            if (currentUser.IsInRole(nameof(StaffRole.BranchAdmin)) || 
                currentUser.IsInRole(nameof(StaffRole.Receptionist)))
            {
                if (currentUser.BranchId != branchId)
                {
                    throw new UnauthorizedAccessException("You do not have access to this branch.");
                }
            }
        }

        public static void EnsureAdminRole(ICurrentUserService currentUser)
        {
            if (!currentUser.IsInRole(nameof(StaffRole.OrgAdmin)) && 
                !currentUser.IsInRole(nameof(StaffRole.BranchAdmin)) && 
                !currentUser.IsInRole(nameof(StaffRole.SuperAdmin)))
            {
                throw new UnauthorizedAccessException("Administrative privileges required.");
            }
        }
    }
}
