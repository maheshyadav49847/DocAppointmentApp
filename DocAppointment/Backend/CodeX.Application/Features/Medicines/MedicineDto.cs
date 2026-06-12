using System;

namespace CodeX.Application.Features.Medicines.DTOs
{
    public class MedicineDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? GenericName { get; set; }
        public string? Type { get; set; }
        public Guid? MedicineTypeId { get; set; }
        public string? Manufacturer { get; set; }
        public bool IsActive { get; set; }
    }
}
