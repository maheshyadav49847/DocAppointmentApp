using CodeX.Application.Common.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Api.Filters
{
    public enum SubscriptionLimitType
    {
        Doctors,
        Branches,
        Staff,
        PatientsPerMonth
    }

    [AttributeUsage(AttributeTargets.Method)]
    public class CheckSubscriptionLimitAttribute : TypeFilterAttribute
    {
        public CheckSubscriptionLimitAttribute(SubscriptionLimitType limitType) : base(typeof(CheckSubscriptionLimitFilter))
        {
            Arguments = new object[] { limitType };
        }
    }

    public class CheckSubscriptionLimitFilter : IAsyncActionFilter
    {
        private readonly SubscriptionLimitType _limitType;
        private readonly IApplicationDbContext _dbContext;
        private readonly ICurrentUserService _currentUserService;

        public CheckSubscriptionLimitFilter(
            SubscriptionLimitType limitType,
            IApplicationDbContext dbContext,
            ICurrentUserService currentUserService)
        {
            _limitType = limitType;
            _dbContext = dbContext;
            _currentUserService = currentUserService;
        }

        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var env = context.HttpContext.RequestServices.GetRequiredService<IWebHostEnvironment>();
            if (env.IsDevelopment())
            {
                await next();
                return;
            }

            if (_currentUserService.OrgId == Guid.Empty)
            {
                await next();
                return;
            }

            var orgId = _currentUserService.OrgId;

            var activeSubscription = await _dbContext.OrganizationSubscriptions
                .Include(s => s.SubscriptionPlan)
                .Where(s => s.OrganizationId == orgId && s.Status == "Active")
                .FirstOrDefaultAsync();

            if (activeSubscription == null)
            {
                context.Result = new ObjectResult(new { Message = "Active subscription required." })
                {
                    StatusCode = StatusCodes.Status402PaymentRequired
                };
                return;
            }

            var plan = activeSubscription.SubscriptionPlan;
            bool limitReached = false;

            switch (_limitType)
            {
                case SubscriptionLimitType.Doctors:
                    var doctorCount = await _dbContext.Doctors.CountAsync(d => d.OrganizationId == orgId);
                    if (doctorCount >= plan.MaxDoctors) limitReached = true;
                    break;
                case SubscriptionLimitType.Branches:
                    var branchCount = await _dbContext.Branches.CountAsync(b => b.OrganizationId == orgId);
                    if (branchCount >= plan.MaxBranches) limitReached = true;
                    break;
                case SubscriptionLimitType.Staff:
                    var staffCount = await _dbContext.Staff.CountAsync(s => s.OrganizationId == orgId);
                    if (staffCount >= plan.MaxStaff) limitReached = true;
                    break;
                case SubscriptionLimitType.PatientsPerMonth:
                    var thisMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                    var patientCount = await _dbContext.Patients
                        .CountAsync(p => p.OrganizationId == orgId && p.CreatedAt >= thisMonth);
                    if (patientCount >= plan.MaxPatientsPerMonth) limitReached = true;
                    break;
            }

            if (limitReached)
            {
                context.Result = new ObjectResult(new { Message = $"Subscription limit reached for {_limitType}." })
                {
                    StatusCode = StatusCodes.Status403Forbidden
                };
                return;
            }

            await next();
        }
    }
}
