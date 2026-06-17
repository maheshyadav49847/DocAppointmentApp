using System.Security.Claims;
using CodeX.Application.Common.Interfaces;

namespace CodeX.Api.Services
{
    public class CurrentUserService : ICurrentUserService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public CurrentUserService(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public string? UserId => _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);

        public Guid OrgId
        {
            get
            {
                var orgIdStr = _httpContextAccessor.HttpContext?.User?.FindFirstValue("orgId");
                return Guid.TryParse(orgIdStr, out var id) ? id : Guid.Empty;
            }
        }

        public Guid? BranchId
        {
            get
            {
                var branchIdStr = _httpContextAccessor.HttpContext?.User?.FindFirstValue("branchId");
                return Guid.TryParse(branchIdStr, out var id) ? id : null;
            }
        }

        public Guid? DoctorId
        {
            get
            {
                var doctorIdStr = _httpContextAccessor.HttpContext?.User?.FindFirstValue("doctorId");
                return Guid.TryParse(doctorIdStr, out var id) ? id : null;
            }
        }

        public bool IsInRole(string role) => _httpContextAccessor.HttpContext?.User?.IsInRole(role) ?? false;
    }
}
