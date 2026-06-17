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
        public string? Gender { get; init; }
        public string? Qualification { get; init; }
        public string? Experience { get; init; }
        public string? Mobile { get; init; }
        public string? EmailId { get; init; }
        public List<Guid> BranchIds { get; init; } = new List<Guid>();
        public string? Password { get; init; }
    }

    public class UpdateDoctorCommandHandler : IRequestHandler<UpdateDoctorCommand, Unit>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public UpdateDoctorCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<Unit> Handle(UpdateDoctorCommand request, CancellationToken cancellationToken)
        {
            var doctor = await _context.Doctors
                .Include(d => d.Branches)
                .FirstOrDefaultAsync(d => d.Id == request.Id, cancellationToken);
            
            if (doctor == null) throw new Exception("Doctor not found");

            CodeX.Application.Common.Authorization.ResourceAuthorization.EnsureOrgOwnership(_currentUserService, doctor.OrganizationId);

            var duplicateExists = await _context.Doctors
                .AnyAsync(d => d.Id != request.Id && 
                               d.OrganizationId == doctor.OrganizationId &&
                               d.Name.ToLower() == request.Name.ToLower() && 
                               !d.IsDeleted, 
                          cancellationToken);

            if (duplicateExists)
            {
                throw new Exception($"Another doctor with the name '{request.Name}' already exists in this organization.");
            }

            doctor.Name = request.Name;
            doctor.Specialization = request.Specialization;
            doctor.RegistrationNumber = request.RegistrationNumber;
            doctor.Gender = request.Gender;
            doctor.Qualification = request.Qualification;
            doctor.Experience = request.Experience;
            doctor.Mobile = request.Mobile;
            doctor.EmailId = request.EmailId;

            // Update Branch Assignments
            doctor.Branches.Clear();
            if (request.BranchIds.Any())
            {
                var branches = await _context.Branches
                    .Where(b => request.BranchIds.Contains(b.Id))
                    .ToListAsync(cancellationToken);
                
                foreach (var branch in branches)
                {
                    doctor.Branches.Add(branch);
                }
            }

            // Update or Create Staff record for the doctor if Email and Password are provided
            if (!string.IsNullOrWhiteSpace(request.EmailId) && !string.IsNullOrWhiteSpace(request.Password))
            {
                var staff = await _context.Staffs.FirstOrDefaultAsync(s => s.DoctorId == doctor.Id, cancellationToken);
                if (staff == null)
                {
                    staff = new CodeX.Domain.Entities.Staff
                    {
                        OrganizationId = doctor.OrganizationId,
                        BranchId = request.BranchIds.FirstOrDefault(),
                        Email = request.EmailId.Trim().ToLower(),
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                        FirstName = request.Name,
                        Role = CodeX.Domain.Enums.StaffRole.Doctor,
                        DoctorId = doctor.Id
                    };
                    _context.Staffs.Add(staff);
                }
                else
                {
                    staff.Email = request.EmailId.Trim().ToLower();
                    staff.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
                    staff.FirstName = request.Name;
                    staff.BranchId = request.BranchIds.FirstOrDefault();
                }
            }
            else if (!string.IsNullOrWhiteSpace(request.EmailId))
            {
                var staff = await _context.Staffs.FirstOrDefaultAsync(s => s.DoctorId == doctor.Id, cancellationToken);
                if (staff != null)
                {
                    staff.Email = request.EmailId.Trim().ToLower();
                    staff.FirstName = request.Name;
                    staff.BranchId = request.BranchIds.FirstOrDefault();
                }
            }

            await _context.SaveChangesAsync(cancellationToken);
            return Unit.Value;
        }
    }
}
