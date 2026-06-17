namespace CodeX.Application.Common.Interfaces
{
    public interface IIdentityService
    {
        string GenerateJwtToken(Guid userId, string email, string role, Guid? branchId, Guid orgId, Guid? doctorId = null);
        string GenerateRefreshToken();
    }
}
