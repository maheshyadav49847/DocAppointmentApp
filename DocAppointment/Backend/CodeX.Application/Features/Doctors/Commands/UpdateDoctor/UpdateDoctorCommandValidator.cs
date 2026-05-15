using FluentValidation;

namespace CodeX.Application.Features.Doctors.Commands.UpdateDoctor
{
    public class UpdateDoctorCommandValidator : AbstractValidator<UpdateDoctorCommand>
    {
        public UpdateDoctorCommandValidator()
        {
            RuleFor(v => v.Id).NotEmpty();
            RuleFor(v => v.Name).NotEmpty().MaximumLength(255);
            RuleFor(v => v.Specialization).NotEmpty().MaximumLength(255);
        }
    }
}
