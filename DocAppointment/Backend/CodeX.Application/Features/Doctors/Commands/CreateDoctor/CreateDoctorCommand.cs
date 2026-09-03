using MediatR;
using CodeX.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;
using CodeX.Domain.Entities;

namespace CodeX.Application.Features.Doctors.Commands.CreateDoctor
{
    public record CreateDoctorCommand : IRequest<Guid>
    {
        public Guid OrganizationId { get; init; }
        public List<Guid> BranchIds { get; init; } = new List<Guid>();
        public string Name { get; init; } = string.Empty;
        public string Specialization { get; init; } = string.Empty;
        public string RegistrationNumber { get; init; } = string.Empty;
        public string? Gender { get; init; }
        public string? Qualification { get; init; }
        public string? Experience { get; init; }
        public string? Mobile { get; init; }
        public string? MobileDialCode { get; init; }
        public string? EmailId { get; init; }
        public string? Password { get; init; }
    }

    public class CreateDoctorCommandHandler : IRequestHandler<CreateDoctorCommand, Guid>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;
        public CreateDoctorCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }


        public async Task<Guid> Handle(CreateDoctorCommand request, CancellationToken cancellationToken)
        {
            CodeX.Application.Common.Authorization.ResourceAuthorization.EnsureOrgOwnership(_currentUserService, request.OrganizationId);
            
            var name = request.Name.Trim();
            var specialization = request.Specialization.Trim();
            var regNum = request.RegistrationNumber.Trim();

            // Code-level check: Prevent duplicate doctor name in the same Organization
            var duplicateNameExists = await _context.Doctors
                .AnyAsync(d => d.OrganizationId == request.OrganizationId && 
                               d.Name.ToLower() == name.ToLower() && 
                               !d.IsDeleted, 
                          cancellationToken);

            if (duplicateNameExists)
            {
                throw new Exception($"A doctor with the name '{name}' already exists in this organization.");
            }

            if (!string.IsNullOrWhiteSpace(request.EmailId))
            {
                var email = request.EmailId.Trim().ToLower();
                var duplicateEmailExists = await _context.Doctors
                    .AnyAsync(d => d.OrganizationId == request.OrganizationId && 
                                   d.EmailId != null && d.EmailId.ToLower() == email && 
                                   !d.IsDeleted, 
                              cancellationToken);
                if (duplicateEmailExists) throw new Exception($"A doctor with the email '{email}' already exists in this organization.");
            }

            if (!string.IsNullOrWhiteSpace(request.Mobile))
            {
                var mobile = request.Mobile.Trim();
                var duplicateMobileExists = await _context.Doctors
                    .AnyAsync(d => d.OrganizationId == request.OrganizationId && 
                                   d.Mobile == mobile && 
                                   !d.IsDeleted, 
                              cancellationToken);
                if (duplicateMobileExists) throw new Exception($"A doctor with the mobile number '{mobile}' already exists in this organization.");
            }

            if (!string.IsNullOrWhiteSpace(regNum))
            {
                var duplicateRegExists = await _context.Doctors
                    .AnyAsync(d => d.OrganizationId == request.OrganizationId && 
                                   d.RegistrationNumber.ToLower() == regNum.ToLower() && 
                                   !d.IsDeleted, 
                              cancellationToken);
                if (duplicateRegExists) throw new Exception($"A doctor with the Registration Number '{regNum}' already exists in this organization.");
            }

            var doctor = new Doctor
            {
                OrganizationId = request.OrganizationId,
                Name = name,
                Specialization = specialization,
                RegistrationNumber = regNum,
                Gender = request.Gender,
                Qualification = request.Qualification,
                Experience = request.Experience,
                Mobile = request.Mobile,
                MobileDialCode = request.MobileDialCode,
                EmailId = request.EmailId
            };

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

            _context.Doctors.Add(doctor);
            
            // Create Staff record for the doctor if Email and Password are provided
            if (!string.IsNullOrWhiteSpace(request.EmailId) && !string.IsNullOrWhiteSpace(request.Password))
            {
                var doctorRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Doctor" && (r.OrganizationId == Guid.Empty || r.OrganizationId == request.OrganizationId), cancellationToken);
                var staff = new CodeX.Domain.Entities.Staff
                {
                    OrganizationId = request.OrganizationId,
                    BranchId = request.BranchIds.Count == 1 ? request.BranchIds.First() : (Guid?)null,
                    Email = request.EmailId.Trim().ToLower(),
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                    FirstName = request.Name,
                    RoleId = doctorRole?.Id,
                    DoctorId = doctor.Id
                };
                _context.Staffs.Add(staff);
            }

            await _context.SaveChangesAsync(cancellationToken);

            return doctor.Id;
        }
    }
}
