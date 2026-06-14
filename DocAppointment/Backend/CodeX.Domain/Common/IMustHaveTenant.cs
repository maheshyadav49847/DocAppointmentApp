using System;

namespace CodeX.Domain.Common
{
    public interface IMustHaveTenant
    {
        Guid OrganizationId { get; set; }
    }

    public interface IMustHaveBranch : IMustHaveTenant
    {
        Guid? BranchId { get; set; }
    }
}
