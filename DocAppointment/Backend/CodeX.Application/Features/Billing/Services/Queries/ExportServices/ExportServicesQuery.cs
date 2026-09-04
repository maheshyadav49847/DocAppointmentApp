using MediatR;
using CodeX.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Authorization;
using System.Text;

namespace CodeX.Application.Features.Billing.Services.Queries.ExportServices
{
    public record ExportServicesQuery(Guid OrganizationId, string? Search = null) : IRequest<byte[]>;

    public class ExportServicesQueryHandler : IRequestHandler<ExportServicesQuery, byte[]>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public ExportServicesQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<byte[]> Handle(ExportServicesQuery request, CancellationToken cancellationToken)
        {
            ResourceAuthorization.EnsureOrgOwnership(_currentUserService, request.OrganizationId);

            var query = _context.ServiceItems
                .Where(x => x.OrganizationId == request.OrganizationId && !x.IsDeleted)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var searchTerm = request.Search.ToLower();
                query = query.Where(x => x.Name.ToLower().Contains(searchTerm) || (x.Category != null && x.Category.ToLower().Contains(searchTerm)));
            }

            var services = await query
                .OrderBy(x => x.Name)
                .Select(x => new
                {
                    x.Name,
                    x.Category,
                    x.DefaultPrice,
                    Status = x.IsActive ? "Active" : "Inactive"
                })
                .ToListAsync(cancellationToken);

            var builder = new StringBuilder();
            builder.AppendLine("Service Name,Category,Default Price,Status");

            foreach (var s in services)
            {
                var name = "\"" + s.Name.Replace("\"", "\"\"") + "\"";
                var category = "\"" + (s.Category != null ? s.Category.Replace("\"", "\"\"") : "") + "\"";
                builder.AppendLine($"{name},{category},{s.DefaultPrice},{s.Status}");
            }

            return Encoding.UTF8.GetBytes(builder.ToString());
        }
    }
}
