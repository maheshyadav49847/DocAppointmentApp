using FluentValidation;
using CodeX.Application.Common.Validators;

namespace CodeX.Application.Features.Doctors.Commands.UpdateDoctor
{
    public class UpdateDoctorCommandValidator : AbstractValidator<UpdateDoctorCommand>
    {
        public UpdateDoctorCommandValidator()
        {
            RuleFor(v => v.Id).NotEmpty();
            RuleFor(v => v.Name).NotEmpty().MaximumLength(255);
            RuleFor(v => v.Specialization).NotEmpty().MaximumLength(255);
            RuleFor(v => v.EmailId).NotEmpty().WithMessage("Email is required.").EmailAddress();
            RuleFor(v => v.Mobile).NotEmpty().WithMessage("Mobile is required.").Matches(@"^\+?[1-9]\d{1,14}$").WithMessage("Invalid phone number format.");
            RuleFor(v => v.RegistrationNumber).NotEmpty().WithMessage("Registration Number is required.");
            RuleFor(v => v.Gender).NotEmpty().WithMessage("Gender is required.");
            RuleFor(v => v.Qualification).NotEmpty().WithMessage("Qualification is required.");
            RuleFor(v => v.Experience).NotEmpty().WithMessage("Experience is required.");
            RuleFor(v => v.BranchIds).NotEmpty().WithMessage("At least one Facility must be selected.");
            RuleFor(v => v.Password!)
                .PasswordRules()
                .When(v => !string.IsNullOrEmpty(v.Password));
        }
    }
}
