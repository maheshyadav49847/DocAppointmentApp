using CodeX.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace CodeX.Application.Features.Analytics.Queries.GetSystemAnalytics
{
    public class GetSystemAnalyticsQuery : IRequest<SystemAnalyticsDto>
    {
    }

    public class SystemAnalyticsDto
    {
        public int TotalOrganizations { get; set; }
        public int ActiveOrganizations { get; set; }
        public int TotalTokensBooked { get; set; }
        public int TotalMessagesSent { get; set; }
        public List<MonthlyGrowthDto> PlatformGrowth { get; set; } = new();
    }

    public class MonthlyGrowthDto
    {
        public string Month { get; set; } = string.Empty;
        public int NewOrganizations { get; set; }
        public int TokensBooked { get; set; }
    }

    public class GetSystemAnalyticsQueryHandler : IRequestHandler<GetSystemAnalyticsQuery, SystemAnalyticsDto>
    {
        private readonly IApplicationDbContext _context;

        public GetSystemAnalyticsQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<SystemAnalyticsDto> Handle(GetSystemAnalyticsQuery request, CancellationToken cancellationToken)
        {
            var totalOrgs = await _context.Organizations.IgnoreQueryFilters().CountAsync(cancellationToken);
            var activeOrgs = await _context.Organizations.IgnoreQueryFilters().CountAsync(o => o.IsActive && !o.IsDeleted, cancellationToken);
            var totalTokens = await _context.Tokens.IgnoreQueryFilters().CountAsync(cancellationToken);
            var totalMessages = await _context.MessageLogs.IgnoreQueryFilters().CountAsync(cancellationToken);

            // Calculate growth for the last 6 months
            var growth = new List<MonthlyGrowthDto>();
            var startDate = DateTime.UtcNow.AddMonths(-5).Date;
            startDate = new DateTime(startDate.Year, startDate.Month, 1);

            var orgsList = await _context.Organizations
                .IgnoreQueryFilters()
                .Where(o => o.CreatedAt >= startDate)
                .Select(o => o.CreatedAt)
                .ToListAsync(cancellationToken);

            var tokensList = await _context.Tokens
                .IgnoreQueryFilters()
                .Where(t => t.CreatedAt >= startDate)
                .Select(t => t.CreatedAt)
                .ToListAsync(cancellationToken);

            for (int i = 0; i < 6; i++)
            {
                var monthStart = startDate.AddMonths(i);
                var monthEnd = monthStart.AddMonths(1);

                growth.Add(new MonthlyGrowthDto
                {
                    Month = monthStart.ToString("MMM yyyy"),
                    NewOrganizations = orgsList.Count(d => d >= monthStart && d < monthEnd),
                    TokensBooked = tokensList.Count(d => d >= monthStart && d < monthEnd)
                });
            }

            return new SystemAnalyticsDto
            {
                TotalOrganizations = totalOrgs,
                ActiveOrganizations = activeOrgs,
                TotalTokensBooked = totalTokens,
                TotalMessagesSent = totalMessages,
                PlatformGrowth = growth
            };
        }
    }
}
