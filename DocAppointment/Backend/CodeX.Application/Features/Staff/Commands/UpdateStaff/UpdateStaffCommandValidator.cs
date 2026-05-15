using FluentValidation;

namespace CodeX.Application.Features.Staff.Commands.UpdateStaff
{
    public class UpdateStaffCommandValidator : AbstractValidator<UpdateStaffCommand>
    {
        public UpdateStaffCommandValidator()
        {
            RuleFor(v => v.Id).NotEmpty();
            RuleFor(v => v.FirstName).NotEmpty().MaximumLength(100);
            RuleFor(v => v.LastName).NotEmpty().MaximumLength(100);
            RuleFor(v => v.Email).NotEmpty().EmailAddress();
            RuleFor(v => v.PhoneNumber).NotEmpty().Matches(@"^\d{10,15}$").WithMessage("Phone number must be between 10 and 15 digits.");
            
            RuleFor(v => v.NewPassword)
                .MinimumLength(8)
                .When(v => !string.IsNullOrEmpty(v.NewPassword));
        }
    }
}
