using CodeX.Application.Common.Interfaces;
using CodeX.Application.Common.Settings;
using CodeX.Application.Features.Auth.Commands.Login;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CodeX.Application.Features.Auth.Commands.RefreshToken
{
    public record RefreshTokenCommand : IRequest<LoginResponse>
    {
        public string Token { get; init; } = string.Empty;
        public string RefreshToken { get; init; } = string.Empty;
    }

    public class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, LoginResponse>
    {
        private readonly IApplicationDbContext _context;
        private readonly IIdentityService _identityService;
        private readonly JwtSettings _jwtSettings;

        public RefreshTokenCommandHandler(IApplicationDbContext context, IIdentityService identityService, IOptions<JwtSettings> jwtOptions)
        {
            _context = context;
            _identityService = identityService;
            _jwtSettings = jwtOptions.Value;
        }

        public async Task<LoginResponse> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
        {
            var storedToken = await _context.RefreshTokens
                .IgnoreQueryFilters()
                .Include(x => x.Staff)
                    .ThenInclude(s => s.Role)
                .FirstOrDefaultAsync(x => x.Token == request.RefreshToken, cancellationToken);

            if (storedToken == null || storedToken.IsRevoked || storedToken.ExpiresAt <= DateTime.UtcNow)
            {
                throw new Exception("Invalid or expired refresh token");
            }

            var staff = storedToken.Staff;

            if (staff.OrganizationId == Guid.Empty)
            {
                throw new Exception("This portal is for organization staff only. System administrators cannot log in here.");
            }

            // Revoke the old token
            storedToken.IsRevoked = true;

            var permissions = staff.Role != null ?
                await _context.RolePermissions.Where(p => p.RoleId == staff.RoleId).Select(p => p.Permission).ToListAsync(cancellationToken) :
                new List<string>();

            Guid? dynamicBranchId = staff.BranchId;
            if (staff.DoctorId.HasValue)
            {
                // Doctors are inherently org-level because they can be assigned sessions in any branch
                dynamicBranchId = null;
            }

            var token = _identityService.GenerateJwtToken(
                staff.Id,
                staff.Email,
                staff.Role?.Name ?? string.Empty,
                dynamicBranchId,
                staff.OrganizationId,
                staff.DoctorId,
                permissions);

            var newRefreshTokenStr = _identityService.GenerateRefreshToken();

            var newRefreshToken = new CodeX.Domain.Entities.RefreshToken
            {
                StaffId = staff.Id,
                Token = newRefreshTokenStr,
                ExpiresAt = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays),
                IsRevoked = false
            };

            _context.RefreshTokens.Add(newRefreshToken);

            await _context.SaveChangesAsync(cancellationToken);

            return new LoginResponse(token, newRefreshTokenStr, staff.Email, staff.Role?.Name ?? string.Empty, staff.OrganizationId, dynamicBranchId, staff.DoctorId);
        }
    }
}
