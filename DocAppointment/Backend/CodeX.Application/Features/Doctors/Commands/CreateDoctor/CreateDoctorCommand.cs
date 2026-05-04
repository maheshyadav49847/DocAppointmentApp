using MediatR;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;

namespace CodeX.Application.Features.Doctors.Commands.CreateDoctor
{
    public record CreateDoctorCommand : IRequest<Guid>
    {
        public Guid BranchId { get; init; }
        public string Name { get; init; } = string.Empty;
        public string Specialization { get; init; } = string.Empty;
        public string? RegistrationNumber { get; init; }
    }

    public class CreateDoctorCommandHandler : IRequestHandler<CreateDoctorCommand, Guid>
    {
        private readonly IApplicationDbContext _context;

        public CreateDoctorCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Guid> Handle(CreateDoctorCommand request, CancellationToken cancellationToken)
        {
            if (!string.IsNullOrEmpty(request.RegistrationNumber))
            {
                var exists = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.AnyAsync(_context.Doctors, d => d.RegistrationNumber == request.RegistrationNumber && !d.IsDeleted, cancellationToken);
                if (exists)
                {
                    throw new System.Exception("A doctor with this registration number already exists.");
                }
            }

            var duplicateExists = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.AnyAsync(_context.Doctors, 
                d => d.Name.ToLower() == request.Name.ToLower() && 
                     d.Specialization.ToLower() == request.Specialization.ToLower() && 
                     !d.IsDeleted, 
                cancellationToken);

            if (duplicateExists)
            {
                throw new System.Exception("A doctor with the same name and specialization already exists in the system.");
            }

            var doctor = new Doctor
            {
                BranchId = request.BranchId,
                Name = request.Name,
                Specialization = request.Specialization,
                RegistrationNumber = request.RegistrationNumber
            };

            _context.Doctors.Add(doctor);
            await _context.SaveChangesAsync(cancellationToken);

            return doctor.Id;
        }
    }
}
