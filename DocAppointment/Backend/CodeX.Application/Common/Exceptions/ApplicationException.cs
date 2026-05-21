namespace CodeX.Application.Common.Exceptions
{
    public abstract class ApplicationException : Exception
    {
        public string ErrorCode { get; }
        public object? ErrorData { get; }

        protected ApplicationException(string message, string errorCode, object? errorData = null)
            : base(message)
        {
            ErrorCode = errorCode;
            ErrorData = errorData;
        }
    }
}
