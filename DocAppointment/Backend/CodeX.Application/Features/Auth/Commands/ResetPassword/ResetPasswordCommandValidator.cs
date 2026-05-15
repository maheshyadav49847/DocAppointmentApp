using FluentValidation;

namespace CodeX.Application.Features.Auth.Commands.ResetPassword
{
    public class ResetPasswordCommandValidator : AbstractValidator<ResetPasswordCommand>
    {
        public ResetPasswordCommandValidator()
        {
            RuleFor(v => v.Identifier).NotEmpty();
            RuleFor(v => v.Token).NotEmpty();
            RuleFor(v => v.NewPassword).NotEmpty().MinimumLength(8);
        }
    }
}
