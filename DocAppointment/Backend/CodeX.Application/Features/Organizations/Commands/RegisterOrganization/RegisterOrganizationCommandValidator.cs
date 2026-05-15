using FluentValidation;

namespace CodeX.Application.Features.Organizations.Commands.RegisterOrganization
{
    public class RegisterOrganizationCommandValidator : AbstractValidator<RegisterOrganizationCommand>
    {
        public RegisterOrganizationCommandValidator()
        {
            RuleFor(v => v.OrgName).NotEmpty().MaximumLength(200);
            RuleFor(v => v.OrgSlug).NotEmpty().MaximumLength(100).Matches(@"^[a-z0-9-]+$").WithMessage("Slug can only contain lowercase letters, numbers, and hyphens.");
            RuleFor(v => v.AdminEmail).NotEmpty().EmailAddress();
            RuleFor(v => v.AdminPassword).NotEmpty().MinimumLength(8);
            RuleFor(v => v.AdminPhoneNumber).NotEmpty().Matches(@"^\d{10,15}$");
        }
    }
}
