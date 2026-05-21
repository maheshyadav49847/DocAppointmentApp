namespace CodeX.Application.Common.Exceptions
{
    public class ForbiddenAccessException : ApplicationException
    {
        public ForbiddenAccessException(string resourceType, string reason = "Insufficient permissions.")
            : base(
                $"Access to {resourceType} is forbidden. {reason}",
                "FORBIDDEN_ACCESS",
                new { ResourceType = resourceType, Reason = reason }
            )
        {
        }
    }
}
