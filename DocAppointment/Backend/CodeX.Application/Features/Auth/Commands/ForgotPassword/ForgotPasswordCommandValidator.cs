using FluentValidation;

namespace CodeX.Application.Features.Auth.Commands.ForgotPassword
{
    public class ForgotPasswordCommandValidator : AbstractValidator<ForgotPasswordCommand>
    {
        public ForgotPasswordCommandValidator()
        {
            RuleFor(v => v.Identifier).NotEmpty();
            RuleFor(v => v.Method).Must(m => m == "Email" || m == "Phone").WithMessage("Method must be 'Email' or 'Phone'.");
        }
    }
}
