using Microsoft.Extensions.Configuration;
using System.Text.RegularExpressions;

namespace CodeX.Application.Common.Security
{
    public static class PasswordValidator
    {
        public static void Validate(string password, IConfiguration configuration)
        {
            var minLength = configuration.GetValue<int>("PasswordPolicy:MinLength", 8);
            var requireDigit = configuration.GetValue<bool>("PasswordPolicy:RequireDigit", true);
            var requireUppercase = configuration.GetValue<bool>("PasswordPolicy:RequireUppercase", true);
            var requireNonAlphanumeric = configuration.GetValue<bool>("PasswordPolicy:RequireNonAlphanumeric", true);

            if (string.IsNullOrEmpty(password) || password.Length < minLength)
                throw new System.Exception($"Password must be at least {minLength} characters long.");

            if (requireDigit && !password.Any(char.IsDigit))
                throw new System.Exception("Password must contain at least one digit.");

            if (requireUppercase && !password.Any(char.IsUpper))
                throw new System.Exception("Password must contain at least one uppercase letter.");

            if (requireNonAlphanumeric && !Regex.IsMatch(password, @"[!@#$%^&*()_+=\[{\]};:<>|./?,-]"))
                throw new System.Exception("Password must contain at least one special character.");
        }
    }
}
