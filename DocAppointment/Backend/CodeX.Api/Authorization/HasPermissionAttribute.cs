using Microsoft.AspNetCore.Authorization;

namespace CodeX.Api.Authorization
{
    public class HasPermissionAttribute : AuthorizeAttribute
    {
        const string POLICY_PREFIX = "HasPermission_";

        public HasPermissionAttribute(string permission) => 
            Permission = permission;

        // Get or set the Age property by manipulating the underlying Policy property
        public string Permission
        {
            get
            {
                if (Policy != null && Policy.StartsWith(POLICY_PREFIX))
                {
                    return Policy.Substring(POLICY_PREFIX.Length);
                }
                return string.Empty;
            }
            set
            {
                Policy = $"{POLICY_PREFIX}{value}";
            }
        }
    }
}
