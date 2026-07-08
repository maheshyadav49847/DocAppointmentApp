using CodeX.Application.Common.Interfaces;
using CodeX.Application.Common.Models;
using CodeX.Application.Features.Medicines.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Application.Features.Medicines.Queries
{
    public class GetMedicinesQuery : IRequest<PaginatedList<MedicineDto>>
    {
        public Guid OrganizationId { get; set; }
        public Guid? DoctorId { get; set; }
        public string? SearchTerm { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 50;
        public string? SortColumn { get; set; }
        public string? SortDirection { get; set; }
    }

    public class GetMedicinesQueryHandler : IRequestHandler<GetMedicinesQuery, PaginatedList<MedicineDto>>
    {
        private readonly IApplicationDbContext _context;

        public GetMedicinesQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<PaginatedList<MedicineDto>> Handle(GetMedicinesQuery request, CancellationToken cancellationToken)
        {
            var query = _context.Medicines
                .IgnoreQueryFilters()
                .Include(m => m.MedicineType)
                .AsNoTracking()
                .Where(m => m.IsActive && !m.IsDeleted);

            // 1. Fetch Doctor's Frequently Prescribed Medicines
            var frequentMedicineNames = new List<string>();
            if (request.DoctorId.HasValue)
            {
                var freqList = await _context.VisitMedicines
                    .Include(vm => vm.PatientVisit)
                    .Where(vm => vm.PatientVisit.DoctorId == request.DoctorId.Value)
                    .GroupBy(vm => vm.MedicineName.ToLower())
                    .Select(g => new { Name = g.Key, Count = g.Count() })
                    .OrderByDescending(x => x.Count)
                    .Take(50)
                    .Select(x => x.Name)
                    .ToListAsync(cancellationToken);

                frequentMedicineNames.AddRange(freqList);
            }

            // 2. Apply Filters
            if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            {
                var term = request.SearchTerm.ToLower();
                query = query.Where(m => m.Name.ToLower().Contains(term) ||
                                         (m.GenericName != null && m.GenericName.ToLower().Contains(term)));

                // Smart Search Sorting (Prefix > Frequent > Popularity)
                if (string.IsNullOrWhiteSpace(request.SortColumn))
                {
                    query = query.OrderByDescending(m => m.Name.ToLower().StartsWith(term))
                                 .ThenByDescending(m => frequentMedicineNames.Contains(m.Name.ToLower()))
                                 .ThenByDescending(m => m.PopularityScore)
                                 .ThenBy(m => m.Name);
                }
            }
            else
            {
                if (string.IsNullOrWhiteSpace(request.SortColumn))
                {
                    // Default Sorting (Frequent > Popularity > Alphabetical)
                    query = query.OrderByDescending(m => frequentMedicineNames.Contains(m.Name.ToLower()))
                                 .ThenByDescending(m => m.PopularityScore)
                                 .ThenBy(m => m.Name);
                }
            }

            // 3. Fallback / Explicit Sorting
            var isDescending = request.SortDirection?.ToLower() == "desc";
            if (!string.IsNullOrWhiteSpace(request.SortColumn))
            {
                query = request.SortColumn.ToLower() switch
                {
                    "genericname" => isDescending ? query.OrderByDescending(m => m.GenericName) : query.OrderBy(m => m.GenericName),
                    "type" => isDescending ? query.OrderByDescending(m => m.MedicineType != null ? m.MedicineType.Name : string.Empty) : query.OrderBy(m => m.MedicineType != null ? m.MedicineType.Name : string.Empty),
                    "manufacturer" => isDescending ? query.OrderByDescending(m => m.Manufacturer) : query.OrderBy(m => m.Manufacturer),
                    "popularity" => isDescending ? query.OrderByDescending(m => m.PopularityScore) : query.OrderBy(m => m.PopularityScore),
                    _ => isDescending ? query.OrderByDescending(m => m.Name) : query.OrderBy(m => m.Name),
                };
            }

            // 4. Project and Paginate
            var dtoQuery = query.Select(m => new MedicineDto
            {
                Id = m.Id,
                Name = m.Name,
                GenericName = m.GenericName,
                Type = m.MedicineType != null ? m.MedicineType.Name : null,
                MedicineTypeId = m.MedicineTypeId,
                Manufacturer = m.Manufacturer,
                IsActive = m.IsActive,
                PopularityScore = m.PopularityScore,
                IsDoctorFrequent = frequentMedicineNames.Contains(m.Name.ToLower())
            });

            return await PaginatedList<MedicineDto>.CreateAsync(dtoQuery, request.PageNumber, request.PageSize);
        }
    }
}
