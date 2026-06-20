using FluentValidation;

namespace CodeX.Application.Common.Validators
{
    public static class PasswordValidatorExtension
    {
        public static IRuleBuilderOptions<T, string> PasswordRules<T>(this IRuleBuilder<T, string> ruleBuilder)
        {
            var msg = "Password must be at least 8 characters long, and include at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.";
            return ruleBuilder
                .MinimumLength(8).WithMessage(msg)
                .Matches("[A-Z]").WithMessage(msg)
                .Matches("[a-z]").WithMessage(msg)
                .Matches("[0-9]").WithMessage(msg)
                .Matches("[^a-zA-Z0-9]").WithMessage(msg);
        }
    }
}
