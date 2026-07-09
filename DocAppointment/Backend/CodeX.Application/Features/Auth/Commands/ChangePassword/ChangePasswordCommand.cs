using CodeX.Application.Common.Interfaces;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Application.Features.Auth.Commands.ChangePassword
{
    public record ChangePasswordCommand : IRequest<bool>
    {
        public string OldPassword { get; init; } = string.Empty;
        public string NewPassword { get; init; } = string.Empty;
        public string ConfirmNewPassword { get; init; } = string.Empty;
    }

    public class ChangePasswordCommandValidator : AbstractValidator<ChangePasswordCommand>
    {
        public ChangePasswordCommandValidator()
        {
            RuleFor(v => v.OldPassword)
                .NotEmpty().WithMessage("Old password is required.");

            RuleFor(v => v.NewPassword)
                .NotEmpty().WithMessage("New password is required.")
                .MinimumLength(8).WithMessage("New password must be at least 8 characters.")
                .NotEqual(v => v.OldPassword).WithMessage("New password cannot be the same as the old password.");

            RuleFor(v => v.ConfirmNewPassword)
                .Equal(v => v.NewPassword).WithMessage("Confirm password does not match new password.");
        }
    }

    public class ChangePasswordCommandHandler : IRequestHandler<ChangePasswordCommand, bool>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public ChangePasswordCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<bool> Handle(ChangePasswordCommand request, CancellationToken cancellationToken)
        {
            var userId = _currentUserService.UserId;
            if (string.IsNullOrEmpty(userId))
            {
                throw new UnauthorizedAccessException();
            }

            var staff = await _context.Staffs
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.Id == Guid.Parse(userId), cancellationToken);

            if (staff == null)
            {
                throw new KeyNotFoundException($"User with id {userId} not found");
            }

            bool isPasswordValid = BCrypt.Net.BCrypt.Verify(request.OldPassword, staff.PasswordHash);
            if (!isPasswordValid)
            {
                var errors = new Dictionary<string, string[]> { { "OldPassword", new[] { "Incorrect old password." } } };
                throw new CodeX.Application.Common.Exceptions.ValidationException(errors);
            }

            staff.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

            await _context.SaveChangesAsync(cancellationToken);

            return true;
        }
    }
}
