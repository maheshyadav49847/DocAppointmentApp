using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using MediatR;

namespace CodeX.Application.Features.Medicines.Commands
{
    public class CreateMedicineCommand : IRequest<Guid>
    {
        public Guid OrganizationId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? GenericName { get; set; }
        public Guid? MedicineTypeId { get; set; }
        public string? Manufacturer { get; set; }

    }

    public class CreateMedicineCommandHandler : IRequestHandler<CreateMedicineCommand, Guid>
    {
        private readonly IApplicationDbContext _context;

        public CreateMedicineCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Guid> Handle(CreateMedicineCommand request, CancellationToken cancellationToken)
        {
            var entity = new MedicineMaster
            {
                OrganizationId = request.OrganizationId,
                Name = request.Name,
                GenericName = request.GenericName,
                MedicineTypeId = request.MedicineTypeId,
                Manufacturer = request.Manufacturer,

                IsActive = true
            };

            _context.Medicines.Add(entity);
            await _context.SaveChangesAsync(cancellationToken);

            return entity.Id;
        }
    }
}
