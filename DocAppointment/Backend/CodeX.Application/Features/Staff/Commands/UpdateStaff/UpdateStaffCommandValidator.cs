using FluentValidation;
using CodeX.Application.Common.Validators;

namespace CodeX.Application.Features.Staff.Commands.UpdateStaff
{
    public class UpdateStaffCommandValidator : AbstractValidator<UpdateStaffCommand>
    {
        public UpdateStaffCommandValidator()
        {
            RuleFor(v => v.Id).NotEmpty();
            RuleFor(v => v.FirstName).NotEmpty().WithMessage("First Name is required.").MaximumLength(100);
            RuleFor(v => v.LastName).NotEmpty().WithMessage("Last Name is required.").MaximumLength(100);
            RuleFor(v => v.Email).NotEmpty().WithMessage("Email is required.").EmailAddress();
            RuleFor(v => v.PhoneNumber).NotEmpty().WithMessage("Phone Number is required.").Matches(@"^\d{10,15}$").WithMessage("Phone number must be between 10 and 15 digits.");
            RuleFor(v => v.EmployeeId).NotEmpty().WithMessage("Employee ID is required.");
            
            RuleFor(v => v.NewPassword!)
                .PasswordRules()
                .When(v => !string.IsNullOrEmpty(v.NewPassword));
        }
    }
}
