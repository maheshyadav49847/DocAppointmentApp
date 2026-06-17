using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using CodeX.Application.Common.Settings;
using Microsoft.Extensions.Options;
using CodeX.Application.Features.Auth.Commands.Login;
using CodeX.Domain.Entities;

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
                .FirstOrDefaultAsync(x => x.Token == request.RefreshToken, cancellationToken);

            if (storedToken == null || storedToken.IsRevoked || storedToken.ExpiresAt <= DateTime.UtcNow)
            {
                throw new Exception("Invalid or expired refresh token");
            }

            var staff = storedToken.Staff;

            // Revoke the old token
            storedToken.IsRevoked = true;

            var token = _identityService.GenerateJwtToken(
                staff.Id, 
                staff.Email,
                staff.Role.ToString(), 
                staff.BranchId, 
                staff.OrganizationId,
                staff.DoctorId);

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

            return new LoginResponse(token, newRefreshTokenStr, staff.Email, staff.Role.ToString(), staff.OrganizationId, staff.BranchId, staff.DoctorId);
        }
    }
}
