using MediatR;
using CodeX.Application.Common.Interfaces;

namespace CodeX.Application.Features.Doctors.Commands.DeleteDoctor
{
    public record DeleteDoctorCommand(Guid Id) : IRequest<Unit>;

    public class DeleteDoctorCommandHandler : IRequestHandler<DeleteDoctorCommand, Unit>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public DeleteDoctorCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<Unit> Handle(DeleteDoctorCommand request, CancellationToken cancellationToken)
        {
            var doctor = await _context.Doctors.FindAsync(new object[] { request.Id }, cancellationToken);
            if (doctor == null) throw new Exception("Doctor not found");

            CodeX.Application.Common.Authorization.ResourceAuthorization.EnsureOrgOwnership(_currentUserService, doctor.OrganizationId);

            doctor.IsDeleted = true;
            await _context.SaveChangesAsync(cancellationToken);
            return Unit.Value;
        }
    }
}
