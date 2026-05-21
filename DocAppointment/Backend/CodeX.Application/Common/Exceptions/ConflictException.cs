namespace CodeX.Application.Common.Exceptions
{
    public class ConflictException : ApplicationException
    {
        public ConflictException(string message, string errorCode = "CONFLICT", object? errorData = null)
            : base(message, errorCode, errorData)
        {
        }
    }
}
