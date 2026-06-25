using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using CodeX.Application.Common.Settings;
using Microsoft.Extensions.Options;
using BCrypt.Net;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using CodeX.Domain.Entities;

namespace CodeX.Application.Features.Auth.Commands.Login
{
    public record LoginCommand : IRequest<LoginResponse>
    {
        public string Email { get; init; } = string.Empty;
        public string Password { get; init; } = string.Empty;
    }

    public record LoginResponse(string Token, string RefreshToken, string Email, string Role, Guid OrgId, Guid? BranchId, Guid? DoctorId = null);

    public class LoginCommandHandler : IRequestHandler<LoginCommand, LoginResponse>
    {
        private readonly IApplicationDbContext _context;
        private readonly IIdentityService _identityService;
        private readonly JwtSettings _jwtSettings;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IConfiguration _configuration;

        public LoginCommandHandler(IApplicationDbContext context, IIdentityService identityService, IOptions<JwtSettings> jwtOptions, IHttpContextAccessor httpContextAccessor, IConfiguration configuration)
        {
            _context = context;
            _identityService = identityService;
            _jwtSettings = jwtOptions.Value;
            _httpContextAccessor = httpContextAccessor;
            _configuration = configuration;
        }

        public async Task<LoginResponse> Handle(LoginCommand request, CancellationToken cancellationToken)
        {
            var normalizedEmail = CodeX.Application.Common.Helpers.NormalizationHelper.NormalizeEmail(request.Email);

            var staff = await _context.Staffs
                .IgnoreQueryFilters()
                .Include(s => s.Role)
                .FirstOrDefaultAsync(x => x.Email.ToLower() == normalizedEmail && !x.IsDeleted, cancellationToken);

            if (staff == null)
            {
                throw new Exception("Invalid credentials");
            }

            if (staff.OrganizationId == Guid.Empty)
            {
                throw new Exception("This organization does not exist or has been disabled. Please contact support.");
            }

            // Check Account Lockout
            if (staff.LockoutEnd.HasValue && staff.LockoutEnd > DateTime.UtcNow)
            {
                throw new Exception($"Account is locked out until {staff.LockoutEnd.Value:u}");
            }

            if (!BCrypt.Net.BCrypt.Verify(request.Password, staff.PasswordHash))
            {
                staff.FailedLoginAttempts++;
                var maxAttempts = _configuration.GetValue<int>("LockoutSettings:MaxFailedAccessAttempts", 5);
                
                if (staff.FailedLoginAttempts >= maxAttempts)
                {
                    var lockoutMinutes = _configuration.GetValue<int>("LockoutSettings:DefaultLockoutTimeSpanMinutes", 15);
                    staff.LockoutEnd = DateTime.UtcNow.AddMinutes(lockoutMinutes);
                }
                
                await _context.SaveChangesAsync(cancellationToken);
                throw new Exception("Invalid credentials");
            }

            // Reset Lockout
            staff.FailedLoginAttempts = 0;
            staff.LockoutEnd = null;

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
                
            var refreshTokenStr = _identityService.GenerateRefreshToken();
            
            var refreshToken = new CodeX.Domain.Entities.RefreshToken
            {
                StaffId = staff.Id,
                Token = refreshTokenStr,
                ExpiresAt = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays),
                IsRevoked = false
            };
            _context.RefreshTokens.Add(refreshToken);
            
            // Log Session
            var context = _httpContextAccessor.HttpContext;
            var ipAddress = context?.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var userAgent = context?.Request.Headers["User-Agent"].ToString() ?? "unknown";
            
            var session = new UserSession
            {
                UserId = staff.Id,
                SessionId = Guid.NewGuid().ToString(),
                IpAddress = ipAddress,
                UserAgent = userAgent,
                LastActiveAt = DateTime.UtcNow
            };
            _context.UserSessions.Add(session);
            
            await _context.SaveChangesAsync(cancellationToken);

            return new LoginResponse(token, refreshTokenStr, staff.Email, staff.Role?.Name ?? string.Empty, staff.OrganizationId, dynamicBranchId, staff.DoctorId);
        }
    }
}
