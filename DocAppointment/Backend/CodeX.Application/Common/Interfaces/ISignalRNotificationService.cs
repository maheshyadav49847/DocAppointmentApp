namespace CodeX.Application.Common.Interfaces
{
    public interface ISignalRNotificationService
    {
        Task SendRolePermissionsUpdatedAsync(Guid orgId, string roleName, CancellationToken cancellationToken);
    }
}
