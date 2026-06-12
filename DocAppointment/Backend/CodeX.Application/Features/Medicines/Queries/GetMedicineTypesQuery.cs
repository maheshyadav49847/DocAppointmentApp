using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CodeX.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Features.Medicines.DTOs;

namespace CodeX.Application.Features.Medicines.Queries
{
    public class GetMedicineTypesQuery : IRequest<List<MedicineTypeDto>>
    {
    }

    public class GetMedicineTypesQueryHandler : IRequestHandler<GetMedicineTypesQuery, List<MedicineTypeDto>>
    {
        private readonly IApplicationDbContext _context;

        public GetMedicineTypesQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<MedicineTypeDto>> Handle(GetMedicineTypesQuery request, CancellationToken cancellationToken)
        {
            var types = await _context.MedicineTypes
                .AsNoTracking()
                .Where(m => !m.IsDeleted)
                .Select(m => new MedicineTypeDto { Id = m.Id, Name = m.Name })
                .OrderBy(t => t.Name)
                .ToListAsync(cancellationToken);

            // Add default fallback if no types exist
            if (!types.Any())
            {
                var defaultNames = new List<string> { "Tablet", "Syrup", "Injection", "Ointment", "Drops" };
                var defaultTypes = defaultNames.Select(n => new CodeX.Domain.Entities.MedicineType { Name = n }).ToList();
                await _context.MedicineTypes.AddRangeAsync(defaultTypes, cancellationToken);
                await _context.SaveChangesAsync(cancellationToken);
                
                types = defaultTypes.Select(m => new MedicineTypeDto { Id = m.Id, Name = m.Name }).ToList();
            }

            return types;
        }
    }
}
