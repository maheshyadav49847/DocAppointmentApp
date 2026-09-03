using MediatR;
using CodeX.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Authorization;

namespace CodeX.Application.Features.Analytics.Queries.GetClinicalAnalytics
{
    public record GetClinicalAnalyticsQuery : IRequest<ClinicalAnalyticsDto>
    {
        public Guid OrganizationId { get; init; }
        public Guid? BranchId { get; init; }
        public DateTime StartDate { get; init; }
        public DateTime EndDate { get; init; }
    }

    public class ClinicalAnalyticsDto
    {
        public int NewPatients { get; set; }
        public int ReturningPatients { get; set; }
        public List<DemographicDto> AgeDemographics { get; set; } = new();
        public List<DemographicDto> GenderDemographics { get; set; } = new();
        public List<DiagnosisTrendDto> TopDiagnoses { get; set; } = new();
    }

    public class DemographicDto
    {
        public string Category { get; set; } = string.Empty;
        public int Count { get; set; }
    }

    public class DiagnosisTrendDto
    {
        public string Diagnosis { get; set; } = string.Empty;
        public int Count { get; set; }
    }

    public class GetClinicalAnalyticsQueryHandler : IRequestHandler<GetClinicalAnalyticsQuery, ClinicalAnalyticsDto>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public GetClinicalAnalyticsQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<ClinicalAnalyticsDto> Handle(GetClinicalAnalyticsQuery request, CancellationToken cancellationToken)
        {
            ResourceAuthorization.EnsureOrgOwnership(_currentUserService, request.OrganizationId);

            var query = _context.Tokens
                .Include(t => t.Patient)
                .Include(t => t.Queue)
                .Where(t => t.OrganizationId == request.OrganizationId &&
                            t.BookedAt >= request.StartDate && 
                            t.BookedAt <= request.EndDate &&
                            !t.IsDeleted);

            if (request.BranchId.HasValue && request.BranchId != Guid.Empty)
            {
                query = query.Where(t => t.Queue.BranchId == request.BranchId.Value);
            }

            var tokens = await query.ToListAsync(cancellationToken);
            var result = new ClinicalAnalyticsDto();

            // Retention: New vs Returning
            // A patient is new if their CreatedAt is within this date range (or specifically, close to the token date)
            // For simplicity: if the Patient was created before StartDate, they are returning, else New.
            foreach (var token in tokens)
            {
                if (token.Patient.CreatedAt < request.StartDate)
                {
                    result.ReturningPatients++;
                }
                else
                {
                    result.NewPatients++;
                }
            }

            // Demographics: Gender
            var uniquePatients = tokens.Select(t => t.Patient).DistinctBy(p => p.Id).ToList();
            
            result.GenderDemographics = uniquePatients
                .GroupBy(p => string.IsNullOrWhiteSpace(p.Gender) ? "Unknown" : p.Gender)
                .Select(g => new DemographicDto { Category = g.Key, Count = g.Count() })
                .ToList();

            // Demographics: Age Brackets
            int under18 = 0, age18to35 = 0, age36to50 = 0, over50 = 0, unknownAge = 0;

            foreach (var patient in uniquePatients)
            {
                if (string.IsNullOrWhiteSpace(patient.Age) || !int.TryParse(patient.Age, out int age))
                {
                    unknownAge++;
                    continue;
                }

                if (age < 18) under18++;
                else if (age <= 35) age18to35++;
                else if (age <= 50) age36to50++;
                else over50++;
            }

            result.AgeDemographics = new List<DemographicDto>
            {
                new DemographicDto { Category = "Under 18", Count = under18 },
                new DemographicDto { Category = "18 - 35", Count = age18to35 },
                new DemographicDto { Category = "36 - 50", Count = age36to50 },
                new DemographicDto { Category = "Over 50", Count = over50 },
                new DemographicDto { Category = "Unknown", Count = unknownAge }
            }.Where(x => x.Count > 0).ToList();

            // Top Diagnoses
            var visitsQuery = _context.PatientVisits
                .Include(v => v.Token)
                .ThenInclude(t => t.Queue)
                .Where(v => v.OrganizationId == request.OrganizationId &&
                            v.VisitDate >= request.StartDate &&
                            v.VisitDate <= request.EndDate &&
                            !v.IsDeleted &&
                            !string.IsNullOrWhiteSpace(v.Diagnosis));

            if (request.BranchId.HasValue && request.BranchId != Guid.Empty)
            {
                visitsQuery = visitsQuery.Where(v => v.Token != null && v.Token.Queue.BranchId == request.BranchId.Value);
            }

            var visits = await visitsQuery.ToListAsync(cancellationToken);

            // Split comma separated diagnoses
            var allDiagnoses = new List<string>();
            foreach (var visit in visits)
            {
                var diagnoses = visit.Diagnosis!.Split(new[] { ',', '\n' }, StringSplitOptions.RemoveEmptyEntries)
                                                .Select(d => d.Trim())
                                                .Where(d => !string.IsNullOrEmpty(d));
                allDiagnoses.AddRange(diagnoses);
            }

            result.TopDiagnoses = allDiagnoses
                .GroupBy(d => d.ToUpper()) // Case insensitive grouping
                .Select(g => new DiagnosisTrendDto { Diagnosis = g.First(), Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .Take(10)
                .ToList();

            return result;
        }
    }
}
