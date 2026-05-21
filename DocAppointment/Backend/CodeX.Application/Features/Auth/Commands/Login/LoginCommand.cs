using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using BCrypt.Net;

namespace CodeX.Application.Features.Auth.Commands.Login
{
    public record LoginCommand : IRequest<LoginResponse>
    {
        public string Email { get; init; } = string.Empty;
        public string Password { get; init; } = string.Empty;
    }

    public record LoginResponse(string Token, string Email, string Role, Guid OrgId, Guid? BranchId);

    public class LoginCommandHandler : IRequestHandler<LoginCommand, LoginResponse>
    {
        private readonly IApplicationDbContext _context;
        private readonly IIdentityService _identityService;

        public LoginCommandHandler(IApplicationDbContext context, IIdentityService identityService)
        {
            _context = context;
            _identityService = identityService;
        }

        public async Task<LoginResponse> Handle(LoginCommand request, CancellationToken cancellationToken)
        {
            var normalizedEmail = CodeX.Application.Common.Helpers.NormalizationHelper.NormalizeEmail(request.Email);

            var staff = await _context.Staffs
                .FirstOrDefaultAsync(x => x.Email == normalizedEmail, cancellationToken);

            if (staff == null || !BCrypt.Net.BCrypt.Verify(request.Password, staff.PasswordHash))
            {
                throw new CodeX.Application.Common.Exceptions.UnauthorizedAccessException(
                    "Invalid email or password.",
                    "INVALID_CREDENTIALS"
                );
            }

            var token = _identityService.GenerateJwtToken(
                staff.Id,
                staff.Email,
                staff.Role.ToString(),
                staff.BranchId,
                staff.OrganizationId);

            return new LoginResponse(token, staff.Email, staff.Role.ToString(), staff.OrganizationId, staff.BranchId);
        }
    }
}
