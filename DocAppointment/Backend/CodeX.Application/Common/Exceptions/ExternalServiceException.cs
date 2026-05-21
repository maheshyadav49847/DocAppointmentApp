namespace CodeX.Application.Common.Exceptions
{
    public class ExternalServiceException : ApplicationException
    {
        public ExternalServiceException(string serviceName, string message, Exception? innerException = null)
            : base(
                $"External service '{serviceName}' failed: {message}",
                "EXTERNAL_SERVICE_ERROR",
                new { ServiceName = serviceName }
            )
        {
        }
    }
}
