using MediatR;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using CodeX.Application.Common.Authorization;

namespace CodeX.Application.Features.Billing.Services.Commands.CreateService
{
    public record CreateServiceCommand : IRequest<Guid>
    {
        public Guid OrganizationId { get; init; }
        public string Name { get; init; } = string.Empty;
        public string? Category { get; init; }
        public decimal DefaultPrice { get; init; }
    }

    public class CreateServiceCommandHandler : IRequestHandler<CreateServiceCommand, Guid>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public CreateServiceCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<Guid> Handle(CreateServiceCommand request, CancellationToken cancellationToken)
        {
            ResourceAuthorization.EnsureOrgOwnership(_currentUserService, request.OrganizationId);

            var entity = new ServiceItem
            {
                OrganizationId = request.OrganizationId,
                Name = request.Name,
                Category = request.Category,
                DefaultPrice = request.DefaultPrice,
                IsActive = true
            };

            _context.ServiceItems.Add(entity);
            await _context.SaveChangesAsync(cancellationToken);

            return entity.Id;
        }
    }
}
