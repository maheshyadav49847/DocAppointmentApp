using System.Text.RegularExpressions;

namespace CodeX.Application.Common.Helpers
{
    public static class PasswordPolicyHelper
    {
        /// <summary>
        /// Enforces password policy: 
        /// - Minimum 8 characters
        /// - At least one uppercase letter
        /// - At least one lowercase letter
        /// - At least one digit
        /// - At least one special character
        /// </summary>
        public static void EnsurePasswordStrength(string password)
        {
            if (string.IsNullOrWhiteSpace(password))
                throw new Exception("Password cannot be empty.");

            if (password.Length < 8)
                throw new Exception("Password must be at least 8 characters long.");

            if (!Regex.IsMatch(password, @"[A-Z]"))
                throw new Exception("Password must contain at least one uppercase letter.");

            if (!Regex.IsMatch(password, @"[a-z]"))
                throw new Exception("Password must contain at least one lowercase letter.");

            if (!Regex.IsMatch(password, @"[0-9]"))
                throw new Exception("Password must contain at least one digit.");

            if (!Regex.IsMatch(password, @"[^a-zA-Z0-9]"))
                throw new Exception("Password must contain at least one special character.");
        }
    }
}
