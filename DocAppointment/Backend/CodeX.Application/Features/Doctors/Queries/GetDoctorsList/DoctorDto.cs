using CodeX.Domain.Entities;

namespace CodeX.Application.Features.Doctors.Queries.GetDoctorsList
{
    public class DoctorDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Specialization { get; set; } = string.Empty;
        public string? RegistrationNumber { get; set; }
        public string BranchName { get; set; } = string.Empty;
    }
}
