namespace CodeX.Application.Features.Doctors.Queries.GetDoctorsList
{
    public class DoctorDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Specialization { get; set; } = string.Empty;
        public string RegistrationNumber { get; set; } = string.Empty;
        public string BranchName { get; set; } = string.Empty;
        public List<Guid> BranchIds { get; set; } = new();
        public string? Gender { get; set; }
        public string? Qualification { get; set; }
        public string? Experience { get; set; }
        public string? Mobile { get; set; }
        public string? MobileDialCode { get; set; }
        public string? EmailId { get; set; }
        public double AverageRating { get; set; }
        public int TotalReviews { get; set; }
    }
}
