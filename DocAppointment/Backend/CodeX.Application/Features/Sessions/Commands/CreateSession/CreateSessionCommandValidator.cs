using FluentValidation;

namespace CodeX.Application.Features.Sessions.Commands.CreateSession
{
    public class CreateSessionCommandValidator : AbstractValidator<CreateSessionCommand>
    {
        public CreateSessionCommandValidator()
        {
            RuleFor(v => v.SessionName).NotEmpty().MaximumLength(200);
            RuleFor(v => v.DoctorId).NotEmpty();
            RuleFor(v => v.BranchId).NotEmpty();
            RuleFor(v => v.StartTime).LessThan(v => v.EndTime).WithMessage("Start time must be before end time.");
            RuleFor(v => v.DefaultCapacity).GreaterThanOrEqualTo(0).WithMessage("Capacity cannot be negative.");
        }
    }
}
