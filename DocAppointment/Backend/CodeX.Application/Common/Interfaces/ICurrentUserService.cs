using System.Security.Claims;

namespace CodeX.Application.Common.Interfaces
{
    public interface ICurrentUserService
    {
        string? UserId { get; }
        Guid OrgId { get; }
        Guid? BranchId { get; }
        bool IsInRole(string role);
    }
}
