using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;

namespace CodeX.Application.Features.Queue.Queries.SearchQueuePatients
{
    public record SearchQueuePatientsQuery(Guid? BranchId, string SearchTerm) : IRequest<List<QueuePatientDto>>;

    public record QueuePatientDto(Guid Id, string Name, string Phone, string? PhoneDialCode, string? Address);

    public class SearchQueuePatientsQueryHandler : IRequestHandler<SearchQueuePatientsQuery, List<QueuePatientDto>>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public SearchQueuePatientsQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<List<QueuePatientDto>> Handle(SearchQueuePatientsQuery request, CancellationToken cancellationToken)
        {
            var query = _context.Patients.AsQueryable();

            // Enforce organization scoping
            if (_currentUserService.OrgId != Guid.Empty)
            {
                query = query.Where(p => p.OrganizationId == _currentUserService.OrgId);
            }

            // Enforce branch-level isolation
            var effectiveBranchId = request.BranchId;
            if (_currentUserService.BranchId.HasValue)
            {
                effectiveBranchId = _currentUserService.BranchId;
            }

            if (effectiveBranchId.HasValue && effectiveBranchId.Value != Guid.Empty)
            {
                query = query.Where(p => !p.Tokens.Any() || p.Tokens.Any(t => t.Queue.BranchId == effectiveBranchId.Value));
            }

            if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            {
                var searchTerm = request.SearchTerm.ToLower();
                query = query.Where(p => 
                    p.Name.ToLower().Contains(searchTerm) || 
                    (p.Phone != null && p.Phone.Contains(searchTerm)) ||
                    (p.PatientCode != null && p.PatientCode.ToLower().Contains(searchTerm)) ||
                    (p.AadhaarNumber != null && p.AadhaarNumber.Contains(searchTerm)) ||
                    (p.Email != null && p.Email.ToLower().Contains(searchTerm)));
            }

            return await query
                .OrderByDescending(p => p.CreatedAt)
                .Take(10) // Only need top 10 for autocomplete
                .Select(p => new QueuePatientDto(p.Id, p.Name, p.Phone, p.PhoneDialCode, p.Address))
                .ToListAsync(cancellationToken);
        }
    }
}
