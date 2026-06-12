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

            // Fetch existing records for this organization to avoid exact duplicates
            var existingRecords = await _context.Medicines.AsNoTracking()
                .Where(m => m.OrganizationId == request.OrganizationId)
                .Select(m => new { m.Name, m.Manufacturer, m.GenericName, m.MedicineTypeId })
                .ToListAsync(cancellationToken);

            var existingKeysSet = new HashSet<string>();
            foreach (var r in existingRecords)
            {
                var key = $"{r.Name?.ToLower().Trim()}|{r.Manufacturer?.ToLower().Trim()}|{r.GenericName?.ToLower().Trim()}|{r.MedicineTypeId}";
                existingKeysSet.Add(key);
            }

            // Fetch existing Medicine Types
            var existingTypes = await _context.MedicineTypes.AsNoTracking()
                .ToDictionaryAsync(t => t.Name.ToLower(), t => t.Id, cancellationToken);

            var newMedicines = new List<MedicineMaster>();
            int totalImported = 0;
            int batchSize = 5000;

            foreach (var med in request.Medicines)
            {
                if (string.IsNullOrWhiteSpace(med.Name)) continue;

                var lowerName = med.Name.Trim().ToLower();
                var lowerMfg = med.Manufacturer?.Trim().ToLower() ?? "";
                var lowerGen = med.GenericName?.Trim().ToLower() ?? "";

                // Resolve Type
                Guid? typeId = null;
                if (!string.IsNullOrWhiteSpace(med.Type))
                {
                    var typeName = med.Type.Trim();
                    var lowerTypeName = typeName.ToLower();
                    if (existingTypes.TryGetValue(lowerTypeName, out var id))
                    {
                        typeId = id;
                    }
                    else
                    {
                        var newType = new MedicineType { Name = typeName };
                        await _context.MedicineTypes.AddAsync(newType, cancellationToken);
                        await _context.SaveChangesAsync(cancellationToken);
                        typeId = newType.Id;
                        existingTypes[lowerTypeName] = typeId.Value;
                    }
                }

                // Fallback auto-assign from Name
                if (typeId == null)
                {
                    foreach (var typeKvp in existingTypes.OrderByDescending(t => t.Key.Length))
                    {
                        if (lowerName.Contains(typeKvp.Key) || 
                            (!string.IsNullOrWhiteSpace(med.GenericName) && med.GenericName.ToLower().Contains(typeKvp.Key)))
                        {
                            typeId = typeKvp.Value;
                            break;
                        }
                    }
                }

                var rowKey = $"{lowerName}|{lowerMfg}|{lowerGen}|{typeId}";

                // Duplicate check
                if (existingKeysSet.Contains(rowKey)) continue;

                newMedicines.Add(new MedicineMaster
                {
                    OrganizationId = request.OrganizationId,
                    Name = med.Name.Trim(),
                    GenericName = string.IsNullOrWhiteSpace(med.GenericName) ? null : med.GenericName.Trim(),
                    MedicineTypeId = typeId,
                    Manufacturer = string.IsNullOrWhiteSpace(med.Manufacturer) ? null : med.Manufacturer.Trim(),
                    CreatedBy = request.UserId,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                });

                // Add to set to prevent duplicates within the uploaded CSV itself
                existingKeysSet.Add(rowKey);

                if (newMedicines.Count >= batchSize)
                {
                    await _context.Medicines.AddRangeAsync(newMedicines, cancellationToken);
                    await _context.SaveChangesAsync(cancellationToken);
                    (_context as DbContext)?.ChangeTracker.Clear(); // Free memory
                    totalImported += newMedicines.Count;
                    newMedicines.Clear();
                }
            }

            if (newMedicines.Any())
            {
                await _context.Medicines.AddRangeAsync(newMedicines, cancellationToken);
                await _context.SaveChangesAsync(cancellationToken);
                totalImported += newMedicines.Count;
            }

            return totalImported; // Return number of successfully imported medicines
        }
    }
}
