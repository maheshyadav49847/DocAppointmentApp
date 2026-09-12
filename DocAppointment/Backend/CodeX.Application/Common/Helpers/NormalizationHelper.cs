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

        /// <summary>
        /// Splits a normalized phone number (e.g. "+919876543210") into dial code ("+91") and local number ("9876543210").
        /// If the number has more than 10 digits, the last 10 are the local number and the rest is the country code.
        /// </summary>
        public static (string DialCode, string LocalPhone) SplitPhoneAndDialCode(string normalizedPhone)
        {
            if (string.IsNullOrWhiteSpace(normalizedPhone))
                return ("+91", "");

            var digits = new string(normalizedPhone.Where(char.IsDigit).ToArray());
            if (digits.Length > 10)
            {
                var countryCode = digits.Substring(0, digits.Length - 10);
                var localPhone = digits.Substring(digits.Length - 10);
                return ("+" + countryCode, localPhone);
            }

            // If 10 or fewer digits, assume it's a local number with default +91
            return ("+91", digits);
        }

        public static string? DecryptString(string? cipherText, string key)
        {
            if (string.IsNullOrEmpty(cipherText))
                return cipherText;

            try
            {
                byte[] iv = new byte[16];
                byte[] buffer = Convert.FromBase64String(cipherText);

                byte[] keyBytes = System.Text.Encoding.UTF8.GetBytes(key);
                if (keyBytes.Length != 16 && keyBytes.Length != 24 && keyBytes.Length != 32)
                {
                    Array.Resize(ref keyBytes, 32);
                }

                using (var aes = System.Security.Cryptography.Aes.Create())
                {
                    aes.Key = keyBytes;
                    aes.IV = iv;
                    var decryptor = aes.CreateDecryptor(aes.Key, aes.IV);

                    using (var memoryStream = new System.IO.MemoryStream(buffer))
                    {
                        using (var cryptoStream = new System.Security.Cryptography.CryptoStream((System.IO.Stream)memoryStream, decryptor, System.Security.Cryptography.CryptoStreamMode.Read))
                        {
                            using (var streamReader = new System.IO.StreamReader((System.IO.Stream)cryptoStream))
                            {
                                return streamReader.ReadToEnd();
                            }
                        }
                    }
                }
            }
            catch (FormatException)
            {
                return cipherText;
            }
            catch (System.Security.Cryptography.CryptographicException)
            {
                return cipherText;
            }
        }
    }
}
