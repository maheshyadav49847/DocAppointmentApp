namespace CodeX.Application.Common.Exceptions
{
    public class BusinessRuleViolationException : ApplicationException
    {
        public BusinessRuleViolationException(string message, string errorCode, object? errorData = null)
            : base(message, errorCode, errorData)
        {
        }
    }
}
