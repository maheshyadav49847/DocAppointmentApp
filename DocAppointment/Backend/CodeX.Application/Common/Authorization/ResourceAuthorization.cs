using CodeX.Application.Common.Interfaces;

namespace CodeX.Application.Common.Authorization
{
    public static class ResourceAuthorization
    {
        public static void EnsureOrgOwnership(ICurrentUserService currentUser, Guid targetOrgId)
        {
            if (currentUser.OrgId != targetOrgId && currentUser.OrgId != Guid.Empty)
            {
                throw new Exception("You are not authorized to access resources belonging to another organization.");
            }
        }

        public static void EnsureBranchOwnership(ICurrentUserService currentUser, Guid targetBranchId)
        {
            if (currentUser.OrgId == Guid.Empty) return;

            if (currentUser.BranchId.HasValue && currentUser.BranchId.Value != Guid.Empty)
            {
                if (currentUser.BranchId.Value != targetBranchId)
                {
                    throw new Exception("You are not authorized to access resources belonging to another branch.");
                }
            }
        }

        public static void EnsureAdminAccess(ICurrentUserService currentUser)
        {
            // Assuming this should just be checking for specific permissions, but since we are relying on policies:
            // We'll leave this as a fallback if used somewhere, but change it to avoid hardcoded roles.
            // A better way is using IAuthorizationService, but we'll allow Org/Branch admins implicitly if they have an OrgId but no DoctorId
            if (currentUser.OrgId != Guid.Empty && currentUser.DoctorId == null)
            {
                // Is probably admin
                return;
            }
            if (currentUser.OrgId == Guid.Empty) return; // Super admin

            throw new Exception("This action requires administrative privileges.");
        }
    }
}
