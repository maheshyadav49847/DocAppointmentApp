using MediatR;
using CodeX.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Authorization;

namespace CodeX.Application.Features.Billing.Services.Queries.GetServices
{
    public record GetServicesQuery(Guid OrganizationId) : IRequest<List<ServiceItemDto>>;

    public class ServiceItemDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Category { get; set; }
        public decimal DefaultPrice { get; set; }
        public bool IsActive { get; set; }
    }

    public class GetServicesQueryHandler : IRequestHandler<GetServicesQuery, List<ServiceItemDto>>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public GetServicesQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<List<ServiceItemDto>> Handle(GetServicesQuery request, CancellationToken cancellationToken)
        {
            ResourceAuthorization.EnsureOrgOwnership(_currentUserService, request.OrganizationId);

            return await _context.ServiceItems
                .Where(x => x.OrganizationId == request.OrganizationId && !x.IsDeleted)
                .Select(x => new ServiceItemDto
                {
                    Id = x.Id,
                    Name = x.Name,
                    Category = x.Category,
                    DefaultPrice = x.DefaultPrice,
                    IsActive = x.IsActive
                })
                .ToListAsync(cancellationToken);
        }
    }
}
