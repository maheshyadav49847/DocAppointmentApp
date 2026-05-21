namespace CodeX.Application.Common.Exceptions
{
    public class UnauthorizedAccessException : ApplicationException
    {
        public UnauthorizedAccessException(string message = "You do not have permission to access this resource.")
            : base(message, "UNAUTHORIZED_ACCESS")
        {
        }

        public UnauthorizedAccessException(string message, string details)
            : base(message, "UNAUTHORIZED_ACCESS", new { Details = details })
        {
        }
    }
}
