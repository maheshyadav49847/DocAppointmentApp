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
            var doctors = await _context.Doctors
                .Include(d => d.Branches)
                .Where(x => x.Branches.Any(b => b.Id == request.BranchId) && !x.IsDeleted)
                .ToListAsync(cancellationToken);

            return doctors.Select(d => new DoctorDto
            {
                Id = d.Id,
                Name = d.Name,
                Specialization = d.Specialization,
                RegistrationNumber = d.RegistrationNumber,
                BranchName = d.Branches.FirstOrDefault(b => b.Id == request.BranchId)?.Name ?? "N/A",
                BranchIds = d.Branches.Select(b => b.Id).ToList(),
                Gender = d.Gender,
                Qualification = d.Qualification,
                Experience = d.Experience,
                Mobile = d.Mobile,
                EmailId = d.EmailId
            }).ToList();
        }
    }
}
