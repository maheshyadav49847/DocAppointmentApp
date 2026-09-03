using MediatR;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using CodeX.Application.Common.Authorization;

namespace CodeX.Application.Features.Billing.Services.Commands.UpdateService
{
    public record UpdateServiceCommand : IRequest<Unit>
    {
        public Guid Id { get; init; }
        public Guid OrganizationId { get; init; }
        public string Name { get; init; } = string.Empty;
        public string? Category { get; init; }
        public decimal DefaultPrice { get; init; }
        public bool IsActive { get; init; }
    }

    public class UpdateServiceCommandHandler : IRequestHandler<UpdateServiceCommand, Unit>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public UpdateServiceCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<Unit> Handle(UpdateServiceCommand request, CancellationToken cancellationToken)
        {
            var entity = await _context.ServiceItems.FindAsync(new object[] { request.Id }, cancellationToken);

            if (entity == null || entity.IsDeleted)
            {
                throw new KeyNotFoundException($"ServiceItem with id {request.Id} not found");
            }
            
            ResourceAuthorization.EnsureOrgOwnership(_currentUserService, entity.OrganizationId);
            ResourceAuthorization.EnsureOrgOwnership(_currentUserService, request.OrganizationId);

            entity.Name = request.Name;
            entity.Category = request.Category;
            entity.DefaultPrice = request.DefaultPrice;
            entity.IsActive = request.IsActive;

            await _context.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
    }
}
