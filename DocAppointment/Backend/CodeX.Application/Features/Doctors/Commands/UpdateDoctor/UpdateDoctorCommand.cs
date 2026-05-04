using MediatR;
using CodeX.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Application.Features.Doctors.Commands.UpdateDoctor
{
    public record UpdateDoctorCommand : IRequest<Unit>
    {
        public Guid Id { get; init; }
        public string Name { get; init; } = string.Empty;
        public string Specialization { get; init; } = string.Empty;
        public string? RegistrationNumber { get; init; }
    }

    public class UpdateDoctorCommandHandler : IRequestHandler<UpdateDoctorCommand, Unit>
    {
        private readonly IApplicationDbContext _context;

        public UpdateDoctorCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Unit> Handle(UpdateDoctorCommand request, CancellationToken cancellationToken)
        {
            var doctor = await _context.Doctors.FindAsync(new object[] { request.Id }, cancellationToken);
            if (doctor == null) throw new Exception("Doctor not found");

            if (!string.IsNullOrEmpty(request.RegistrationNumber) && doctor.RegistrationNumber != request.RegistrationNumber)
            {
                var exists = await _context.Doctors.AnyAsync(d => d.Id != request.Id && d.RegistrationNumber == request.RegistrationNumber && !d.IsDeleted, cancellationToken);
                if (exists) throw new Exception("Another doctor with this registration number already exists.");
            }

            var duplicateExists = await _context.Doctors.AnyAsync(
                d => d.Id != request.Id && 
                     d.Name.ToLower() == request.Name.ToLower() && 
                     d.Specialization.ToLower() == request.Specialization.ToLower() && 
                     !d.IsDeleted, 
                cancellationToken);

            if (duplicateExists)
            {
                throw new Exception("Another doctor with the same name and specialization already exists in the system.");
            }

            doctor.Name = request.Name;
            doctor.Specialization = request.Specialization;
            doctor.RegistrationNumber = request.RegistrationNumber;

            await _context.SaveChangesAsync(cancellationToken);
            return Unit.Value;
        }
    }
}
