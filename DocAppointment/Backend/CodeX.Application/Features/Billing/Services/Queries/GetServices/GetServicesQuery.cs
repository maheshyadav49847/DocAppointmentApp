using MediatR;
using CodeX.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Authorization;
using CodeX.Application.Common.Models;

namespace CodeX.Application.Features.Billing.Services.Queries.GetServices
{
    public record GetServicesQuery(Guid OrganizationId, string? Search = null, int Page = 1, int PageSize = 10) : IRequest<PaginatedList<ServiceItemDto>>;

    public class ServiceItemDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Category { get; set; }
        public decimal DefaultPrice { get; set; }
        public bool IsActive { get; set; }
    }

    public class GetServicesQueryHandler : IRequestHandler<GetServicesQuery, PaginatedList<ServiceItemDto>>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public GetServicesQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<PaginatedList<ServiceItemDto>> Handle(GetServicesQuery request, CancellationToken cancellationToken)
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

            var dtos = query.Select(x => new ServiceItemDto
            {
                Id = x.Id,
                Name = x.Name,
                Category = x.Category,
                DefaultPrice = x.DefaultPrice,
                IsActive = x.IsActive
            });

            dtos = dtos.OrderBy(x => x.Name);

            var totalCount = await dtos.CountAsync(cancellationToken);
            var items = await dtos.Skip((request.Page - 1) * request.PageSize).Take(request.PageSize).ToListAsync(cancellationToken);

            return new PaginatedList<ServiceItemDto>(items, totalCount, request.Page, request.PageSize);
        }
    }
}
