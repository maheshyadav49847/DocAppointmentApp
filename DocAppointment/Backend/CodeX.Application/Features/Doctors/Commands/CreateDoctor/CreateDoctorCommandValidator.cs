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

            RuleFor(v => v.BranchId)
                .NotEmpty();

            RuleFor(v => v.Specialization)
                .NotEmpty();
        }
    }
}
