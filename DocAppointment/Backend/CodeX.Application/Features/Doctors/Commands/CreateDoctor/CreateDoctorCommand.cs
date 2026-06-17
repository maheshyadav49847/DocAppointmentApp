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
        public string? RegistrationNumber { get; init; }
        public string? Gender { get; init; }
        public string? Qualification { get; init; }
        public string? Experience { get; init; }
        public string? Mobile { get; init; }
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
            var regNum = request.RegistrationNumber?.Trim();

            // Code-level check: Prevent duplicate doctor name in the same Organization
            var duplicateExists = await _context.Doctors
                .AnyAsync(d => d.OrganizationId == request.OrganizationId && 
                               d.Name.ToLower() == name.ToLower() && 
                               !d.IsDeleted, 
                          cancellationToken);

            if (duplicateExists)
            {
                throw new Exception($"A doctor with the name '{name}' already exists in this organization.");
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
                var staff = new CodeX.Domain.Entities.Staff
                {
                    OrganizationId = request.OrganizationId,
                    BranchId = request.BranchIds.FirstOrDefault(),
                    Email = request.EmailId.Trim().ToLower(),
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                    FirstName = request.Name,
                    Role = CodeX.Domain.Enums.StaffRole.Doctor,
                    DoctorId = doctor.Id
                };
                _context.Staffs.Add(staff);
            }

            await _context.SaveChangesAsync(cancellationToken);

            return doctor.Id;
        }
    }
}
