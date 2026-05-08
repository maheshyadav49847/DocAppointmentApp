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
        public string PhoneNumber { get; init; } = string.Empty;
        public string Role { get; init; } = string.Empty;
        public Guid OrganizationId { get; init; }
        public Guid? BranchId { get; init; }
        public string? BranchName { get; init; }
        public DateTime CreatedAt { get; init; }
    }

    public record GetStaffListQuery(Guid BranchId) : IRequest<List<StaffDto>>;

    public class GetStaffListQueryHandler : IRequestHandler<GetStaffListQuery, List<StaffDto>>
    {
        private readonly IApplicationDbContext _context;

        public GetStaffListQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<StaffDto>> Handle(GetStaffListQuery request, CancellationToken cancellationToken)
        {
            return await _context.Staffs
                .Include(s => s.Branch)
                .Where(s => s.BranchId == request.BranchId)
                .Select(s => new StaffDto
                {
                    Id = s.Id,
                    Email = s.Email,
                    FirstName = s.FirstName,
                    LastName = s.LastName,
                    EmployeeId = s.EmployeeId,
                    PhoneNumber = s.PhoneNumber,
                    Role = s.Role.ToString(),
                    OrganizationId = s.OrganizationId,
                    BranchId = s.BranchId,
                    BranchName = s.Branch != null ? s.Branch.Name : null,
                    CreatedAt = s.CreatedAt
                })
                .ToListAsync(cancellationToken);
        }
    }
}
