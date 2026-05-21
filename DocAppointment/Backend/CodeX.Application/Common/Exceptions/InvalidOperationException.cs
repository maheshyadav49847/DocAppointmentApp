namespace CodeX.Application.Common.Exceptions
{
    public class InvalidOperationException : ApplicationException
    {
        public InvalidOperationException(string message, string errorCode = "INVALID_OPERATION")
            : base(message, errorCode)
        {
        }

        public InvalidOperationException(string message, string errorCode, object? errorData)
            : base(message, errorCode, errorData)
        {
        }
    }
}
