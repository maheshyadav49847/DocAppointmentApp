namespace CodeX.Application.Common.Helpers
{
    public static class NormalizationHelper
    {
        public static string NormalizePhone(string phoneNumber, string defaultCountryCode = "91")
        {
            if (string.IsNullOrWhiteSpace(phoneNumber))
            {
                return string.Empty;
            }

            var trimmed = phoneNumber.Trim();
            if (trimmed.StartsWith("whatsapp:", StringComparison.OrdinalIgnoreCase))
            {
                trimmed = trimmed["whatsapp:".Length..];
            }

            if (trimmed.EndsWith("@c.us", StringComparison.OrdinalIgnoreCase))
            {
                trimmed = trimmed[..^"@c.us".Length];
            }

            var digits = new string(trimmed.Where(char.IsDigit).ToArray());
            if (digits.Length == 10)
            {
                digits = defaultCountryCode + digits;
            }

            return "+" + digits;
        }

        public static string NormalizeEmail(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
            {
                return string.Empty;
            }

            return email.Trim().ToLowerInvariant();
        }

        public static string[] GetPhoneVariations(string phoneNumber)
        {
            if (string.IsNullOrWhiteSpace(phoneNumber)) return new[] { string.Empty };
            var digits = new string(phoneNumber.Where(char.IsDigit).ToArray());
            var local = digits.Length > 10 ? digits.Substring(digits.Length - 10) : digits;
            return new[] { phoneNumber, digits, local, "+" + digits }.Distinct().ToArray();
        }
    }
}
