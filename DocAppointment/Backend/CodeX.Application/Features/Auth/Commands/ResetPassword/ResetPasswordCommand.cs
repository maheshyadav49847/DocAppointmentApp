using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using BCrypt.Net;

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

        public ResetPasswordCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<bool> Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
        {
            var isEmail = request.Identifier.Contains("@");
            var normalizedIdentifier = isEmail ? 
                CodeX.Application.Common.Helpers.NormalizationHelper.NormalizeEmail(request.Identifier) : 
                CodeX.Application.Common.Helpers.NormalizationHelper.NormalizePhone(request.Identifier);

            var staff = await _context.Staffs
                .FirstOrDefaultAsync(x => x.Email == normalizedIdentifier || x.PhoneNumber == normalizedIdentifier, cancellationToken);

            if (staff == null || staff.PasswordResetToken != request.Token || staff.ResetTokenExpiry < DateTime.UtcNow)
            {
                throw new Exception("Invalid or expired reset token");
            }

            // Update password
            CodeX.Application.Common.Helpers.PasswordPolicyHelper.EnsurePasswordStrength(request.NewPassword);
            staff.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            
            // Clear token
            staff.PasswordResetToken = null;
            staff.ResetTokenExpiry = null;

            await _context.SaveChangesAsync(cancellationToken);

            return true;
        }
    }
}
