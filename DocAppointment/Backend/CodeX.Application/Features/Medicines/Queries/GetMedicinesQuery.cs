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
            var query = _context.Medicines.AsNoTracking()
                .Where(m => m.OrganizationId == request.OrganizationId && m.IsActive);

            if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            {
                var term = request.SearchTerm.ToLower();
                query = query.Where(m => m.Name.ToLower().Contains(term) || 
                                         (m.GenericName != null && m.GenericName.ToLower().Contains(term)));
            }

            var dtoQuery = query.OrderBy(m => m.Name).Select(m => new MedicineDto
            {
                Id = m.Id,
                Name = m.Name,
                GenericName = m.GenericName,
                Type = m.Type,
                Manufacturer = m.Manufacturer,
                IsActive = m.IsActive
            });

            return await PaginatedList<MedicineDto>.CreateAsync(dtoQuery, request.PageNumber, request.PageSize);
        }
    }
}
