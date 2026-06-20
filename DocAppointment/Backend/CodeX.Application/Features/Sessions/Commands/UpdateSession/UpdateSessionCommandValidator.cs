using FluentValidation;
using CodeX.Application.Features.Sessions.Commands.UpdateSession;

namespace CodeX.Application.Features.Sessions.Commands.UpdateSession
{
    public class UpdateSessionCommandValidator : AbstractValidator<UpdateSessionCommand>
    {
        public UpdateSessionCommandValidator()
        {
            RuleFor(v => v.Id).NotEmpty();
            RuleFor(v => v.SessionName).NotEmpty().WithMessage("Session Name is required.").MaximumLength(200);
            RuleFor(v => v.StartTime).LessThan(v => v.EndTime).WithMessage("Start time must be before end time.");
            RuleFor(v => v.DefaultCapacity).GreaterThan(0).WithMessage("Capacity must be greater than zero.");
        }
    }
}
