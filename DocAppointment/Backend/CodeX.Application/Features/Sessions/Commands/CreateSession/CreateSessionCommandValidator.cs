using FluentValidation;

namespace CodeX.Application.Features.Sessions.Commands.CreateSession
{
    public class CreateSessionCommandValidator : AbstractValidator<CreateSessionCommand>
    {
        public CreateSessionCommandValidator()
        {
            RuleFor(v => v.SessionName).NotEmpty().WithMessage("Session Name is required.").MaximumLength(200);
            RuleFor(v => v.DoctorId).NotEmpty().WithMessage("Doctor is required.");
            RuleFor(v => v.BranchId).NotEmpty().WithMessage("Facility is required.");
            RuleFor(v => v.StartTime).LessThan(v => v.EndTime).WithMessage("Start time must be before end time.");
            RuleFor(v => v.DefaultCapacity).GreaterThan(0).WithMessage("Capacity must be greater than zero.");
        }
    }
}
