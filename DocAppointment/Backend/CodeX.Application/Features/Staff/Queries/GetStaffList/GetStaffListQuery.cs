using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;

namespace CodeX.Application.Features.Staff.Queries.GetStaffList
{
    public record StaffDto
    {
        public Guid Id { get; init; }
        public string Email { get; init; } = string.Empty;
        public string FirstName { get; init; } = string.Empty;
        public string LastName { get; init; } = string.Empty;
        public string EmployeeId { get; init; } = string.Empty;
        public string PhoneNumberDialCode { get; init; } = "+91";
        public string PhoneNumber { get; init; } = string.Empty;
        public string Role { get; init; } = string.Empty;
        public Guid OrganizationId { get; init; }
        public Guid? BranchId { get; init; }
        public string? BranchName { get; init; }
        public DateTime CreatedAt { get; init; }
        public bool IsLockedOut { get; init; }
        public DateTime? LockoutEnd { get; init; }
        public bool IsActive { get; init; }
    }

    public record GetStaffListQuery(Guid OrganizationId, Guid? BranchId) : IRequest<List<StaffDto>>;

    public class GetStaffListQueryHandler : IRequestHandler<GetStaffListQuery, List<StaffDto>>
    {
        private readonly IApplicationDbContext _context;

        public GetStaffListQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<StaffDto>> Handle(GetStaffListQuery request, CancellationToken cancellationToken)
        {
            var query = _context.Staffs
                .Include(s => s.Branch)
                .Include(s => s.Role)
                .Where(s => s.OrganizationId == request.OrganizationId && !s.IsDeleted && s.DoctorId == null);

            if (request.BranchId.HasValue)
            {
                query = query.Where(s => s.BranchId == request.BranchId.Value);
            }
            else
            {
                query = query.Where(s => s.BranchId == null);
            }

            var now = DateTime.UtcNow;

            return await query
                .Select(s => new StaffDto
                {
                    Id = s.Id,
                    Email = s.Email,
                    FirstName = s.FirstName,
                    LastName = s.LastName,
                    EmployeeId = s.EmployeeId,
                    PhoneNumberDialCode = s.PhoneNumberDialCode,
                    PhoneNumber = s.PhoneNumber,
                    Role = s.Role != null ? s.Role.Name : string.Empty,
                    OrganizationId = s.OrganizationId,
                    BranchId = s.BranchId,
                    BranchName = s.Branch != null ? s.Branch.Name : null,
                    CreatedAt = s.CreatedAt,
                    IsLockedOut = s.LockoutEnd.HasValue && s.LockoutEnd > now,
                    LockoutEnd = s.LockoutEnd,
                    IsActive = s.IsActive
                })
                .ToListAsync(cancellationToken);
        }
    }
}
