using CodeX.Application.Common.Interfaces;
using CodeX.Application.Features.Medicines.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Application.Features.Medicines.Queries
{
    public class GetMedicineByIdQuery : IRequest<MedicineDto>
    {
        public Guid Id { get; set; }
        public Guid OrganizationId { get; set; }
    }

    public class GetMedicineByIdQueryHandler : IRequestHandler<GetMedicineByIdQuery, MedicineDto>
    {
        private readonly IApplicationDbContext _context;

        public GetMedicineByIdQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<MedicineDto> Handle(GetMedicineByIdQuery request, CancellationToken cancellationToken)
        {
            var m = await _context.Medicines
                
                .Include(x => x.MedicineType)
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == request.Id && !x.IsDeleted, cancellationToken);

            if (m == null)
            {
                throw new KeyNotFoundException($"MedicineMaster with id {request.Id} not found");
            }

            return new MedicineDto
            {
                Id = m.Id,
                Name = m.Name,
                GenericName = m.GenericName,
                Type = m.MedicineType != null ? m.MedicineType.Name : null,
                MedicineTypeId = m.MedicineTypeId,
                Manufacturer = m.Manufacturer,
                IsActive = m.IsActive
            };
        }
    }
}
