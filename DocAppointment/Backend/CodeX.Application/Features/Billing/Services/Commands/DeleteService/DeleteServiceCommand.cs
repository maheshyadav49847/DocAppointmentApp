using MediatR;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using CodeX.Application.Common.Authorization;

namespace CodeX.Application.Features.Billing.Services.Commands.DeleteService
{
    public record DeleteServiceCommand(Guid Id) : IRequest<Unit>;

    public class DeleteServiceCommandHandler : IRequestHandler<DeleteServiceCommand, Unit>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public DeleteServiceCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<Unit> Handle(DeleteServiceCommand request, CancellationToken cancellationToken)
        {
            var entity = await _context.ServiceItems.FindAsync(new object[] { request.Id }, cancellationToken);

            if (entity == null || entity.IsDeleted)
            {
                throw new KeyNotFoundException($"ServiceItem with id {request.Id} not found");
            }
            
            ResourceAuthorization.EnsureOrgOwnership(_currentUserService, entity.OrganizationId);

            entity.IsDeleted = true;
            entity.IsActive = false;

            await _context.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
    }
}
