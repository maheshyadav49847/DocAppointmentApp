using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using CodeX.Domain.Enums;

namespace CodeX.Application.Features.Staff.Commands.CreateStaff
{
    public record CreateStaffCommand : IRequest<Guid>
    {
        public Guid BranchId { get; init; }
        public Guid OrganizationId { get; init; }
        public string Email { get; init; } = string.Empty;
        public string Password { get; init; } = string.Empty;
        public StaffRole Role { get; init; } = StaffRole.Receptionist;
    }

    public class CreateStaffCommandHandler : IRequestHandler<CreateStaffCommand, Guid>
    {
        private readonly IApplicationDbContext _context;

        public CreateStaffCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Guid> Handle(CreateStaffCommand request, CancellationToken cancellationToken)
        {
            var emailExists = await _context.Staffs
                .AnyAsync(s => s.Email.ToLower() == request.Email.ToLower(), cancellationToken);

            if (emailExists)
                throw new Exception("A staff member with this email already exists.");

            var staff = new CodeX.Domain.Entities.Staff
            {
                OrganizationId = request.OrganizationId,
                BranchId = request.BranchId,
                Email = request.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Role = request.Role
            };

            _context.Staffs.Add(staff);
            await _context.SaveChangesAsync(cancellationToken);

            return staff.Id;
        }
    }
}
