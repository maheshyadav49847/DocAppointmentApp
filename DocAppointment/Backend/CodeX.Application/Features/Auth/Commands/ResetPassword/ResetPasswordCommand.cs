using CodeX.Application.Common.Interfaces;
using CodeX.Application.Common.Security;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace CodeX.Application.Features.Auth.Commands.ResetPassword
{
    public record ResetPasswordCommand : IRequest<bool>
    {
        public string Identifier { get; init; } = string.Empty;
        public string Token { get; init; } = string.Empty;
        public string NewPassword { get; init; } = string.Empty;
    }

    public class ResetPasswordCommandHandler : IRequestHandler<ResetPasswordCommand, bool>
    {
        private readonly IApplicationDbContext _context;
        private readonly IConfiguration _configuration;

        public ResetPasswordCommandHandler(IApplicationDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<bool> Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
        {
            var isEmail = request.Identifier.Contains("@");
            var normalizedIdentifier = isEmail ?
                CodeX.Application.Common.Helpers.NormalizationHelper.NormalizeEmail(request.Identifier) :
                CodeX.Application.Common.Helpers.NormalizationHelper.NormalizePhone(request.Identifier);

            var staff = await _context.Staffs
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(x => x.Email.ToLower() == normalizedIdentifier || x.PhoneNumber == normalizedIdentifier, cancellationToken);

            if (staff == null || staff.PasswordResetToken != request.Token || staff.ResetTokenExpiry < DateTime.UtcNow)
            {
                throw new Exception("Invalid or expired reset token");
            }

            // Update password
            PasswordValidator.Validate(request.NewPassword, _configuration);
            staff.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

            // Clear token and unlock account
            staff.PasswordResetToken = null;
            staff.ResetTokenExpiry = null;
            staff.FailedLoginAttempts = 0;
            staff.LockoutEnd = null;

            await _context.SaveChangesAsync(cancellationToken);

            return true;
        }
    }
}
