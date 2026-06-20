using FluentValidation;
using CodeX.Application.Common.Validators;

namespace CodeX.Application.Features.Staff.Commands.CreateStaff
{
    public class CreateStaffCommandValidator : AbstractValidator<CreateStaffCommand>
    {
        public CreateStaffCommandValidator()
        {
            RuleFor(v => v.FirstName).NotEmpty().MaximumLength(100);
            RuleFor(v => v.LastName).NotEmpty().MaximumLength(100);
            RuleFor(v => v.Email).NotEmpty().EmailAddress();
            RuleFor(v => v.Password).NotEmpty().PasswordRules();
            RuleFor(v => v.PhoneNumber).NotEmpty().Matches(@"^\d{10,15}$").WithMessage("Phone number must be between 10 and 15 digits.");
            RuleFor(v => v.OrganizationId).NotEmpty();
        }
    }
}
