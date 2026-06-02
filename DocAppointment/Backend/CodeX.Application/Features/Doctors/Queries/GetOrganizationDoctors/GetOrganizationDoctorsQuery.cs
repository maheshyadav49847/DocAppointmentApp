using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using CodeX.Application.Features.Doctors.Queries.GetDoctorsList;

namespace CodeX.Application.Features.Doctors.Queries.GetOrganizationDoctors
{
    public record GetOrganizationDoctorsQuery(Guid OrganizationId) : IRequest<List<DoctorDto>>;

    public class GetOrganizationDoctorsQueryHandler : IRequestHandler<GetOrganizationDoctorsQuery, List<DoctorDto>>
    {
        private readonly IApplicationDbContext _context;

        public GetOrganizationDoctorsQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<DoctorDto>> Handle(GetOrganizationDoctorsQuery request, CancellationToken cancellationToken)
        {
            var doctors = await _context.Doctors
                .Include(d => d.Branches)
                .Where(x => x.OrganizationId == request.OrganizationId && !x.IsDeleted)
                .ToListAsync(cancellationToken);

            return doctors.Select(d => new DoctorDto
            {
                Id = d.Id,
                Name = d.Name,
                Specialization = d.Specialization,
                RegistrationNumber = d.RegistrationNumber,
                BranchName = string.Join(", ", d.Branches.Select(b => b.Name)),
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
