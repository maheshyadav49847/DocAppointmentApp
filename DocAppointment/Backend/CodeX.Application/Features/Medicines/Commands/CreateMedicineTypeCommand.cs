using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Application.Features.Medicines.Commands
{
    public class CreateMedicineTypeCommand : IRequest<Guid>
    {
        public string Name { get; set; } = string.Empty;
    }

    public class CreateMedicineTypeCommandHandler : IRequestHandler<CreateMedicineTypeCommand, Guid>
    {
        private readonly IApplicationDbContext _context;

        public CreateMedicineTypeCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Guid> Handle(CreateMedicineTypeCommand request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new ArgumentException("Medicine Type name cannot be empty");

            var trimmedName = request.Name.Trim();

            // Check if it already exists
            var existing = await _context.MedicineTypes
                .FirstOrDefaultAsync(t => t.Name.ToLower() == trimmedName.ToLower(), cancellationToken);

            if (existing != null)
                return existing.Id;

            var newType = new MedicineType
            {
                Name = trimmedName
            };

            await _context.MedicineTypes.AddAsync(newType, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);

            return newType.Id;
        }
    }
}
