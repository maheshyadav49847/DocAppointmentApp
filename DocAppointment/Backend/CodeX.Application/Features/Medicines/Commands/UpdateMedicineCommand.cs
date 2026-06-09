using System;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using MediatR;

namespace CodeX.Application.Features.Medicines.Commands
{
    public class UpdateMedicineCommand : IRequest<Unit>
    {
        public Guid Id { get; set; }
        public Guid OrganizationId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? GenericName { get; set; }
        public string? Type { get; set; }
        public string? Manufacturer { get; set; }

    }

    public class UpdateMedicineCommandHandler : IRequestHandler<UpdateMedicineCommand, Unit>
    {
        private readonly IApplicationDbContext _context;

        public UpdateMedicineCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Unit> Handle(UpdateMedicineCommand request, CancellationToken cancellationToken)
        {
            var entity = await _context.Medicines.FindAsync(new object[] { request.Id }, cancellationToken);

            if (entity == null || entity.OrganizationId != request.OrganizationId)
            {
                throw new KeyNotFoundException($"MedicineMaster with id {request.Id} not found");
            }

            entity.Name = request.Name;
            entity.GenericName = request.GenericName;
            entity.Type = request.Type;
            entity.Manufacturer = request.Manufacturer;


            await _context.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
    }
}
