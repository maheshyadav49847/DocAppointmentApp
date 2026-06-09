using System;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using MediatR;

namespace CodeX.Application.Features.Medicines.Commands
{
    public class DeleteMedicineCommand : IRequest<Unit>
    {
        public Guid Id { get; set; }
        public Guid OrganizationId { get; set; }
    }

    public class DeleteMedicineCommandHandler : IRequestHandler<DeleteMedicineCommand, Unit>
    {
        private readonly IApplicationDbContext _context;

        public DeleteMedicineCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Unit> Handle(DeleteMedicineCommand request, CancellationToken cancellationToken)
        {
            var entity = await _context.Medicines.FindAsync(new object[] { request.Id }, cancellationToken);

            if (entity == null || entity.OrganizationId != request.OrganizationId)
            {
                throw new KeyNotFoundException($"MedicineMaster with id {request.Id} not found");
            }

            _context.Medicines.Remove(entity);
            await _context.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
    }
}
