namespace CodeX.Application.Common.Interfaces
{
    public interface ICurrentUserService
    {
        string? UserId { get; }
        Guid OrgId { get; }
        Guid? BranchId { get; }
        Guid? TokenBranchId { get; }
        Guid? DoctorId { get; }
        bool IsInRole(string role);
        bool HasPermission(string permission);
        void SetCurrentOrganization(Guid orgId);
    }
}
