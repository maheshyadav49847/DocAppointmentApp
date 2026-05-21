namespace CodeX.Application.Common.Sanitization
{
    /// <summary>
    /// Marks a property for HTML sanitization during input processing
    /// </summary>
    [AttributeUsage(AttributeTargets.Property)]
    public class SanitizeHtmlAttribute : Attribute { }

    /// <summary>
    /// Marks a property for text sanitization (removes dangerous content)
    /// </summary>
    [AttributeUsage(AttributeTargets.Property)]
    public class SanitizeTextAttribute : Attribute { }

    /// <summary>
    /// Marks a property for email sanitization and validation
    /// </summary>
    [AttributeUsage(AttributeTargets.Property)]
    public class SanitizeEmailAttribute : Attribute { }

    /// <summary>
    /// Marks a property for phone number sanitization
    /// </summary>
    [AttributeUsage(AttributeTargets.Property)]
    public class SanitizePhoneAttribute : Attribute { }

    /// <summary>
    /// Marks a property for URL sanitization
    /// </summary>
    [AttributeUsage(AttributeTargets.Property)]
    public class SanitizeUrlAttribute : Attribute { }

    /// <summary>
    /// Marks a property for file name sanitization (prevents directory traversal)
    /// </summary>
    [AttributeUsage(AttributeTargets.Property)]
    public class SanitizeFileNameAttribute : Attribute { }

    /// <summary>
    /// Marks a property for search query sanitization
    /// </summary>
    [AttributeUsage(AttributeTargets.Property)]
    public class SanitizeSearchQueryAttribute : Attribute { }

    /// <summary>
    /// Marks a property for timezone sanitization
    /// </summary>
    [AttributeUsage(AttributeTargets.Property)]
    public class SanitizeTimeZoneAttribute : Attribute { }
}
