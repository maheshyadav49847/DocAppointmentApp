using FluentValidation;
using CodeX.Application.Common.Validators;

namespace CodeX.Application.Features.Doctors.Commands.CreateDoctor
{
    public class CreateDoctorCommandValidator : AbstractValidator<CreateDoctorCommand>
    {
        public CreateDoctorCommandValidator()
        {
            RuleFor(v => v.Name)
                .MaximumLength(255)
                .NotEmpty();

            RuleFor(v => v.OrganizationId)
                .NotEmpty();

            RuleFor(v => v.Specialization)
                .NotEmpty();

            RuleFor(v => v.EmailId)
                .NotEmpty().WithMessage("Email is required.")
                .EmailAddress();

            RuleFor(v => v.Mobile)
                .NotEmpty().WithMessage("Mobile is required.")
                .Matches(@"^\+?[1-9]\d{1,14}$").WithMessage("Invalid phone number format.");

            RuleFor(v => v.RegistrationNumber).NotEmpty().WithMessage("Registration Number is required.");
            RuleFor(v => v.Gender).NotEmpty().WithMessage("Gender is required.");
            RuleFor(v => v.Qualification).NotEmpty().WithMessage("Qualification is required.");
            RuleFor(v => v.Experience).NotEmpty().WithMessage("Experience is required.");
            RuleFor(v => v.Password!)
                .NotEmpty().WithMessage("Password is required.")
                .PasswordRules();
            RuleFor(v => v.BranchIds).NotEmpty().WithMessage("At least one Branch must be selected.");
        }
    }
}
