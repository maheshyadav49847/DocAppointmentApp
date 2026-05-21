namespace CodeX.Application.Common.Exceptions
{
    public class EntityNotFoundException : ApplicationException
    {
        public EntityNotFoundException(string entityName, object? id = null)
            : base(
                $"{entityName} not found{(id != null ? $" (ID: {id})" : "")}.",
                "ENTITY_NOT_FOUND",
                new { EntityName = entityName, Id = id }
            )
        {
        }
    }
}
