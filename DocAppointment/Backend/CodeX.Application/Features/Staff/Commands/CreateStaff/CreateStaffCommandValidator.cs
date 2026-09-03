using CodeX.Application.Common.Validators;
using FluentValidation;

namespace CodeX.Application.Features.Staff.Commands.CreateStaff
{
    public class CreateStaffCommandValidator : AbstractValidator<CreateStaffCommand>
    {
        public CreateStaffCommandValidator()
        {
            RuleFor(v => v.FirstName).NotEmpty().WithMessage("First Name is required.").MaximumLength(100);
            RuleFor(v => v.LastName).NotEmpty().WithMessage("Last Name is required.").MaximumLength(100);
            RuleFor(v => v.Email).NotEmpty().WithMessage("Email is required.").EmailAddress();
            RuleFor(v => v.Password).NotEmpty().WithMessage("Password is required.").PasswordRules();
            RuleFor(v => v.PhoneNumber).NotEmpty().WithMessage("Phone Number is required.").Matches(@"^\d{10,15}$").WithMessage("Phone number must be between 10 and 15 digits.");
            RuleFor(v => v.EmployeeId).NotEmpty().WithMessage("Employee ID is required.");
            RuleFor(v => v.OrganizationId).NotEmpty();
        }
    }
}
