using CodeX.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Application.Features.Reports.Queries.GetPatientDemographicsReport
{
    public class PatientDemographicsReportRowDto
    {
        public string AgeGroup { get; set; } = string.Empty;
        public int Male { get; set; }
        public int Female { get; set; }
        public int Other { get; set; }
        public int Total { get; set; }
    }

    public class PatientDemographicsReportDto
    {
        public int TotalPatients { get; set; }
        public List<PatientDemographicsReportRowDto> DetailedRows { get; set; } = new();
    }

    public class GetPatientDemographicsReportQuery : IRequest<PatientDemographicsReportDto>
    {
        public Guid OrganizationId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
    }

    public class GetPatientDemographicsReportQueryHandler : IRequestHandler<GetPatientDemographicsReportQuery, PatientDemographicsReportDto>
    {
        private readonly IApplicationDbContext _context;

        public GetPatientDemographicsReportQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<PatientDemographicsReportDto> Handle(GetPatientDemographicsReportQuery request, CancellationToken cancellationToken)
        {
            // Analyze unique patients seen in this period based on visits or tokens
            var patientIds = await _context.Tokens
                .Where(t => t.OrganizationId == request.OrganizationId 
                            && t.BookedAt >= request.StartDate 
                            && t.BookedAt <= request.EndDate
                            && !t.IsDeleted)
                .Select(t => t.PatientId)
                .Distinct()
                .ToListAsync(cancellationToken);

            var patients = await _context.Patients
                .Where(p => patientIds.Contains(p.Id))
                .Select(p => new { p.Age, p.Gender })
                .ToListAsync(cancellationToken);

            // Group into buckets
            var rows = new List<PatientDemographicsReportRowDto>();
            var ageBuckets = new[] { "0-18", "19-35", "36-50", "51+", "Unknown" };

            foreach (var bucket in ageBuckets)
            {
                rows.Add(new PatientDemographicsReportRowDto { AgeGroup = bucket });
            }

            foreach (var p in patients)
            {
                int age = -1;
                if (!string.IsNullOrEmpty(p.Age) && int.TryParse(p.Age, out int parsed))
                {
                    age = parsed;
                }

                string bucket = "Unknown";
                if (age >= 0 && age <= 18) bucket = "0-18";
                else if (age >= 19 && age <= 35) bucket = "19-35";
                else if (age >= 36 && age <= 50) bucket = "36-50";
                else if (age >= 51) bucket = "51+";

                var row = rows.First(r => r.AgeGroup == bucket);
                var g = (p.Gender ?? "").ToLower();
                
                if (g.StartsWith("m")) row.Male++;
                else if (g.StartsWith("f")) row.Female++;
                else row.Other++;

                row.Total++;
            }

            return new PatientDemographicsReportDto
            {
                TotalPatients = patients.Count,
                DetailedRows = rows
            };
        }
    }
}
