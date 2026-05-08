using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;

namespace CodeX.Application.Features.Doctors.Queries.GetDoctorsList
{
    public record GetDoctorsListQuery(Guid BranchId) : IRequest<List<DoctorDto>>;

    public class GetDoctorsListQueryHandler : IRequestHandler<GetDoctorsListQuery, List<DoctorDto>>
    {
        private readonly IApplicationDbContext _context;

        public GetDoctorsListQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<DoctorDto>> Handle(GetDoctorsListQuery request, CancellationToken cancellationToken)
        {
            return await _context.Doctors
                .Where(x => x.Branches.Any(b => b.Id == request.BranchId))
                .Select(d => new DoctorDto
                {
                    Id = d.Id,
                    Name = d.Name,
                    Specialization = d.Specialization,
                    RegistrationNumber = d.RegistrationNumber,
                    // Note: Doctor can have multiple branches now, so returning the requested branch's name
                    BranchName = d.Branches.FirstOrDefault(b => b.Id == request.BranchId)!.Name
                })
                .ToListAsync(cancellationToken);
        }
    }
}
