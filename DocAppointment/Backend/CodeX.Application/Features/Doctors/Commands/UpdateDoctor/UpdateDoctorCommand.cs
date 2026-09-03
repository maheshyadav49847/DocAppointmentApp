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
        public string RegistrationNumber { get; init; } = string.Empty;
        public string? Gender { get; init; }
        public string? Qualification { get; init; }
        public string? Experience { get; init; }
        public string? Mobile { get; init; }
        public string? MobileDialCode { get; init; }
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

            // Branch Isolation
            if (_currentUserService.BranchId.HasValue && _currentUserService.BranchId.Value != Guid.Empty)
            {
                if (!doctor.Branches.Any(b => b.Id == _currentUserService.BranchId.Value))
                {
                    throw new UnauthorizedAccessException("You do not have permission to edit this doctor.");
                }
            }

            var name = request.Name.Trim();
            var regNum = request.RegistrationNumber.Trim();

            var duplicateNameExists = await _context.Doctors
                .AnyAsync(d => d.Id != request.Id && 
                               d.OrganizationId == doctor.OrganizationId &&
                               d.Name.ToLower() == name.ToLower() && 
                               !d.IsDeleted, 
                          cancellationToken);

            if (duplicateNameExists)
            {
                throw new Exception($"Another doctor with the name '{name}' already exists in this organization.");
            }

            if (!string.IsNullOrWhiteSpace(request.EmailId))
            {
                var email = request.EmailId.Trim().ToLower();
                var duplicateEmailExists = await _context.Doctors
                    .AnyAsync(d => d.Id != request.Id && 
                                   d.OrganizationId == doctor.OrganizationId &&
                                   d.EmailId != null && d.EmailId.ToLower() == email && 
                                   !d.IsDeleted, 
                              cancellationToken);
                if (duplicateEmailExists) throw new Exception($"Another doctor with the email '{email}' already exists in this organization.");
            }

            if (!string.IsNullOrWhiteSpace(request.Mobile))
            {
                var mobile = request.Mobile.Trim();
                var duplicateMobileExists = await _context.Doctors
                    .AnyAsync(d => d.Id != request.Id && 
                                   d.OrganizationId == doctor.OrganizationId &&
                                   d.Mobile == mobile && 
                                   !d.IsDeleted, 
                              cancellationToken);
                if (duplicateMobileExists) throw new Exception($"Another doctor with the mobile number '{mobile}' already exists in this organization.");
            }

            if (!string.IsNullOrWhiteSpace(regNum))
            {
                var duplicateRegExists = await _context.Doctors
                    .AnyAsync(d => d.Id != request.Id && 
                                   d.OrganizationId == doctor.OrganizationId &&
                                   d.RegistrationNumber.ToLower() == regNum.ToLower() && 
                                   !d.IsDeleted, 
                              cancellationToken);
                if (duplicateRegExists) throw new Exception($"Another doctor with the Registration Number '{regNum}' already exists in this organization.");
            }

            doctor.Name = name;
            doctor.Specialization = request.Specialization;
            doctor.RegistrationNumber = request.RegistrationNumber;
            doctor.Gender = request.Gender;
            doctor.Qualification = request.Qualification;
            doctor.Experience = request.Experience;
            doctor.Mobile = request.Mobile;
            doctor.MobileDialCode = request.MobileDialCode;
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

            // Create Staff record for the doctor if Email and Password are provided and it doesn't exist
            if (!string.IsNullOrWhiteSpace(request.EmailId) && !string.IsNullOrWhiteSpace(request.Password))
            {
                var staff = await _context.Staffs.FirstOrDefaultAsync(s => s.DoctorId == doctor.Id, cancellationToken);
                if (staff == null)
                {
                    var doctorRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Doctor" && (r.OrganizationId == Guid.Empty || r.OrganizationId == doctor.OrganizationId), cancellationToken);
                    staff = new CodeX.Domain.Entities.Staff
                    {
                        OrganizationId = doctor.OrganizationId,
                        BranchId = request.BranchIds.Count == 1 ? request.BranchIds.First() : (Guid?)null,
                        Email = request.EmailId.Trim().ToLower(),
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                        FirstName = request.Name,
                        RoleId = doctorRole?.Id,
                        DoctorId = doctor.Id
                    };
                    _context.Staffs.Add(staff);
                }
                else
                {
                    staff.Email = request.EmailId.Trim().ToLower();
                    staff.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
                    staff.FirstName = request.Name;
                    staff.BranchId = request.BranchIds.Count == 1 ? request.BranchIds.First() : (Guid?)null;
                }
            }
            else if (!string.IsNullOrWhiteSpace(request.EmailId))
            {
                var staff = await _context.Staffs.FirstOrDefaultAsync(s => s.DoctorId == doctor.Id, cancellationToken);
                if (staff != null)
                {
                    staff.Email = request.EmailId.Trim().ToLower();
                    staff.FirstName = request.Name;
                    staff.BranchId = request.BranchIds.Count == 1 ? request.BranchIds.First() : (Guid?)null;
                }
            }

            await _context.SaveChangesAsync(cancellationToken);
            return Unit.Value;
        }
    }
}
