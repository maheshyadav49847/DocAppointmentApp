using MediatR;
using CodeX.Application.Common.Interfaces;

namespace CodeX.Application.Features.Doctors.Commands.DeleteDoctor
{
    public record DeleteDoctorCommand(Guid Id) : IRequest<Unit>;

    public class DeleteDoctorCommandHandler : IRequestHandler<DeleteDoctorCommand, Unit>
    {
        private readonly IApplicationDbContext _context;

        public DeleteDoctorCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Unit> Handle(DeleteDoctorCommand request, CancellationToken cancellationToken)
        {
            var doctor = await _context.Doctors.FindAsync(new object[] { request.Id }, cancellationToken);
            if (doctor == null) throw new Exception("Doctor not found");

            _context.Doctors.Remove(doctor);
            await _context.SaveChangesAsync(cancellationToken);
            return Unit.Value;
        }
    }
}
