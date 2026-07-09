using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;

namespace CodeX.Application.Features.Branches.Queries.GetBranches
{
    public record GetBranchesQuery() : IRequest<List<Branch>>;

    public class GetBranchesQueryHandler : IRequestHandler<GetBranchesQuery, List<Branch>>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public GetBranchesQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<List<Branch>> Handle(GetBranchesQuery request, CancellationToken cancellationToken)
        {
            var query = _context.Branches.AsQueryable();

            if (_currentUserService.DoctorId.HasValue && _currentUserService.DoctorId.Value != Guid.Empty)
            {
                query = query.Where(b => b.Doctors.Any(d => d.Id == _currentUserService.DoctorId.Value));
            }
            else if (_currentUserService.TokenBranchId.HasValue && _currentUserService.TokenBranchId.Value != Guid.Empty)
            {
                query = query.Where(b => b.Id == _currentUserService.TokenBranchId.Value);
            }

            return await query.ToListAsync(cancellationToken);
        }
    }
}
