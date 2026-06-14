using FluentValidation;

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
                .EmailAddress().When(v => !string.IsNullOrEmpty(v.EmailId));

            RuleFor(v => v.Mobile)
                .Matches(@"^\+?[1-9]\d{1,14}$").WithMessage("Invalid phone number format.").When(v => !string.IsNullOrEmpty(v.Mobile));
        }
    }
}
