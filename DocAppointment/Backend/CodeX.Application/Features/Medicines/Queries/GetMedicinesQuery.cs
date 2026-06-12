using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CodeX.Application.Common.Interfaces;
using CodeX.Application.Features.Medicines.DTOs;
using CodeX.Application.Common.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Application.Features.Medicines.Queries
{
    public class GetMedicinesQuery : IRequest<PaginatedList<MedicineDto>>
    {
        public Guid OrganizationId { get; set; }
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
                .Include(m => m.MedicineType)
                .AsNoTracking()
                .Where(m => m.OrganizationId == request.OrganizationId && m.IsActive);

            if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            {
                var term = request.SearchTerm.ToLower();
                query = query.Where(m => m.Name.ToLower().Contains(term) || 
                                         (m.GenericName != null && m.GenericName.ToLower().Contains(term)));
            }

            var isDescending = request.SortDirection?.ToLower() == "desc";

            query = request.SortColumn?.ToLower() switch
            {
                "genericname" => isDescending ? query.OrderByDescending(m => m.GenericName) : query.OrderBy(m => m.GenericName),
                "type" => isDescending ? query.OrderByDescending(m => m.MedicineType != null ? m.MedicineType.Name : string.Empty) : query.OrderBy(m => m.MedicineType != null ? m.MedicineType.Name : string.Empty),
                "manufacturer" => isDescending ? query.OrderByDescending(m => m.Manufacturer) : query.OrderBy(m => m.Manufacturer),
                _ => isDescending ? query.OrderByDescending(m => m.Name) : query.OrderBy(m => m.Name),
            };

            var dtoQuery = query.Select(m => new MedicineDto
            {
                Id = m.Id,
                Name = m.Name,
                GenericName = m.GenericName,
                Type = m.MedicineType != null ? m.MedicineType.Name : null,
                MedicineTypeId = m.MedicineTypeId,
                Manufacturer = m.Manufacturer,
                IsActive = m.IsActive
            });

            return await PaginatedList<MedicineDto>.CreateAsync(dtoQuery, request.PageNumber, request.PageSize);
        }
    }
}
