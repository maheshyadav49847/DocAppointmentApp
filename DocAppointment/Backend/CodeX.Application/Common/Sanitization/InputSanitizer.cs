using System.Text.RegularExpressions;

namespace CodeX.Application.Common.Sanitization
{
    public static class InputSanitizer
    {
        /// <summary>
        /// Removes/escapes HTML and potentially harmful content
        /// </summary>
        public static string SanitizeHtml(string? input)
        {
            if (string.IsNullOrWhiteSpace(input))
                return string.Empty;

            // Remove script tags and content
            input = Regex.Replace(input, @"<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>", "", RegexOptions.IgnoreCase);

            // Remove other dangerous tags
            var dangerousTags = new[] { "iframe", "object", "embed", "link", "meta", "style" };
            foreach (var tag in dangerousTags)
            {
                input = Regex.Replace(input, $@"<{tag}\b[^<]*(?:(?!<\/{tag}>)<[^<]*)*<\/{tag}>", "", RegexOptions.IgnoreCase);
            }

            // Remove event handlers (onclick, onerror, onload, etc.)
            input = Regex.Replace(input, @"\s*on\w+\s*=\s*[""']?[^""'>\s]+[""']?", "", RegexOptions.IgnoreCase);

            // HTML encode remaining dangerous characters
            input = System.Net.WebUtility.HtmlEncode(input);

            return input.Trim();
        }

        /// <summary>
        /// Sanitizes text input (names, descriptions, etc.)
        /// </summary>
        public static string SanitizeText(string? input, int maxLength = 500)
        {
            if (string.IsNullOrWhiteSpace(input))
                return string.Empty;

            // Remove null bytes
            input = input.Replace("\0", "");

            // Remove control characters except newlines and tabs
            input = Regex.Replace(input, @"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "");

            // Trim whitespace
            input = input.Trim();

            // Limit length
            if (input.Length > maxLength)
                input = input[..maxLength];

            return input;
        }

        /// <summary>
        /// Validates and sanitizes email address
        /// </summary>
        public static string SanitizeEmail(string? input)
        {
            if (string.IsNullOrWhiteSpace(input))
                return string.Empty;

            input = input.Trim().ToLowerInvariant();

            // Basic email validation regex
            const string emailPattern = @"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$";

            if (!Regex.IsMatch(input, emailPattern))
                throw new Exceptions.InvalidOperationException(
                    "Invalid email format",
                    "INVALID_EMAIL_FORMAT"
                );

            return input;
        }

        /// <summary>
        /// Validates and sanitizes phone number (already exists in NormalizationHelper, but adding here too)
        /// </summary>
        public static string SanitizePhoneNumber(string? input)
        {
            if (string.IsNullOrWhiteSpace(input))
                return string.Empty;

            // Remove all non-digit and non-plus characters
            input = Regex.Replace(input, @"[^\d+]", "");

            // Validate length (10-15 digits as per FluentValidation)
            if (input.Length < 10 || input.Length > 15)
                throw new Exceptions.InvalidOperationException(
                    "Phone number must be 10-15 digits",
                    "INVALID_PHONE_FORMAT"
                );

            return input;
        }

        /// <summary>
        /// Sanitizes numeric input to prevent integer overflow attacks
        /// </summary>
        public static int SanitizeInteger(int value, int minValue = int.MinValue, int maxValue = int.MaxValue)
        {
            if (value < minValue || value > maxValue)
                throw new Exceptions.InvalidOperationException(
                    $"Value must be between {minValue} and {maxValue}",
                    "INVALID_INTEGER_RANGE"
                );

            return value;
        }

        /// <summary>
        /// Sanitizes numeric input to prevent decimal overflow attacks
        /// </summary>
        public static decimal SanitizeDecimal(decimal value, decimal minValue = decimal.MinValue, decimal maxValue = decimal.MaxValue)
        {
            if (value < minValue || value > maxValue)
                throw new Exceptions.InvalidOperationException(
                    $"Value must be between {minValue} and {maxValue}",
                    "INVALID_DECIMAL_RANGE"
                );

            return value;
        }

        /// <summary>
        /// Validates GUID format
        /// </summary>
        public static Guid SanitizeGuid(Guid value)
        {
            if (value == Guid.Empty)
                throw new Exceptions.InvalidOperationException(
                    "GUID cannot be empty",
                    "INVALID_GUID"
                );

            return value;
        }

        /// <summary>
        /// Sanitizes JSON string input
        /// </summary>
        public static string SanitizeJson(string? input)
        {
            if (string.IsNullOrWhiteSpace(input))
                return string.Empty;

            // Remove potentially harmful prefixes
            input = input.TrimStart();

            if (input.StartsWith("/*") || input.StartsWith("//"))
                throw new Exceptions.InvalidOperationException(
                    "Invalid JSON format",
                    "INVALID_JSON"
                );

            return input;
        }

        /// <summary>
        /// Sanitizes file names to prevent directory traversal attacks
        /// </summary>
        public static string SanitizeFileName(string? input)
        {
            if (string.IsNullOrWhiteSpace(input))
                return string.Empty;

            // Remove path traversal attempts
            input = input.Replace("..", "");
            input = input.Replace("~", "");
            input = input.Replace("/", "");
            input = input.Replace("\\", "");
            input = input.Replace("\0", "");

            // Remove control characters
            input = Regex.Replace(input, @"[\x00-\x1F\x7F]", "");

            // Allow only safe characters: alphanumeric, dash, underscore, dot
            input = Regex.Replace(input, @"[^a-zA-Z0-9._-]", "");

            // Limit length
            if (input.Length > 255)
                input = input[..255];

            return input.Trim();
        }

        /// <summary>
        /// Sanitizes URL to prevent open redirect and javascript: URIs
        /// </summary>
        public static string SanitizeUrl(string? input)
        {
            if (string.IsNullOrWhiteSpace(input))
                return string.Empty;

            input = input.Trim();

            // Block dangerous protocols
            var dangerousProtocols = new[] { "javascript:", "data:", "vbscript:", "file:" };
            foreach (var protocol in dangerousProtocols)
            {
                if (input.StartsWith(protocol, StringComparison.OrdinalIgnoreCase))
                    throw new Exceptions.InvalidOperationException(
                        "URL contains invalid protocol",
                        "INVALID_URL_PROTOCOL"
                    );
            }

            // Validate URL format
            if (!Uri.TryCreate(input, UriKind.RelativeOrAbsolute, out var uri))
                throw new Exceptions.InvalidOperationException(
                    "Invalid URL format",
                    "INVALID_URL_FORMAT"
                );

            return input;
        }

        /// <summary>
        /// Sanitizes search query to prevent injection attacks
        /// </summary>
        public static string SanitizeSearchQuery(string? input, int maxLength = 100)
        {
            if (string.IsNullOrWhiteSpace(input))
                return string.Empty;

            // Remove SQL-like commands (basic protection, EF Core handles parameterization)
            var sqlPatterns = new[] { "drop", "delete", "insert", "update", "exec", "execute", "select", "union" };
            var lowerInput = input.ToLowerInvariant();

            foreach (var pattern in sqlPatterns)
            {
                if (Regex.IsMatch(lowerInput, $@"\b{pattern}\b"))
                    throw new Exceptions.InvalidOperationException(
                        "Search query contains invalid characters",
                        "INVALID_SEARCH_QUERY"
                    );
            }

            return SanitizeText(input, maxLength);
        }

        /// <summary>
        /// Sanitizes time zone string
        /// </summary>
        public static string SanitizeTimeZone(string? input)
        {
            if (string.IsNullOrWhiteSpace(input))
                return "UTC";

            input = input.Trim();

            try
            {
                TimeZoneInfo.FindSystemTimeZoneById(input);
                return input;
            }
            catch
            {
                throw new Exceptions.InvalidOperationException(
                    "Invalid timezone",
                    "INVALID_TIMEZONE"
                );
            }
        }
    }
}
