using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Application.Features.Medicines.Commands
{
    public class MedicineImportDto
    {
        [CsvHelper.Configuration.Attributes.Name("BrandName")]
        public string Name { get; set; } = string.Empty;
        
        [CsvHelper.Configuration.Attributes.Name("GenericName")]
        public string? GenericName { get; set; }
        
        public string? Type { get; set; }
        public string? Manufacturer { get; set; }
    }

    public class ImportMedicinesCommand : IRequest<int>
    {
        public Guid OrganizationId { get; set; }
        public Guid UserId { get; set; }
        public List<MedicineImportDto> Medicines { get; set; } = new();
    }

    public class ImportMedicinesCommandHandler : IRequestHandler<ImportMedicinesCommand, int>
    {
        private readonly IApplicationDbContext _context;

        public ImportMedicinesCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<int> Handle(ImportMedicinesCommand request, CancellationToken cancellationToken)
        {
            if (request.Medicines == null || !request.Medicines.Any())
                return 0;

            // Fetch existing brand names for this organization to avoid duplicates
            var existingNames = await _context.Medicines.AsNoTracking()
                .Where(m => m.OrganizationId == request.OrganizationId)
                .Select(m => m.Name.ToLower())
                .ToListAsync(cancellationToken);

            var existingNamesSet = new HashSet<string>(existingNames);

            var newMedicines = new List<MedicineMaster>();

            foreach (var med in request.Medicines)
            {
                if (string.IsNullOrWhiteSpace(med.Name)) continue;

                var lowerName = med.Name.Trim().ToLower();

                // Duplicate check
                if (existingNamesSet.Contains(lowerName)) continue;

                newMedicines.Add(new MedicineMaster
                {
                    OrganizationId = request.OrganizationId,
                    Name = med.Name.Trim(),
                    GenericName = string.IsNullOrWhiteSpace(med.GenericName) ? null : med.GenericName.Trim(),
                    Type = string.IsNullOrWhiteSpace(med.Type) ? null : med.Type.Trim(),
                    Manufacturer = string.IsNullOrWhiteSpace(med.Manufacturer) ? null : med.Manufacturer.Trim(),
                    CreatedBy = request.UserId,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                });

                // Add to set to prevent duplicates within the uploaded CSV itself
                existingNamesSet.Add(lowerName);
            }

            if (newMedicines.Any())
            {
                await _context.Medicines.AddRangeAsync(newMedicines, cancellationToken);
                await _context.SaveChangesAsync(cancellationToken);
            }

            return newMedicines.Count; // Return number of successfully imported medicines
        }
    }
}
