using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CodeX.Application.Features.Ratings.Queries.GetDoctorRatings
{
    public class DoctorRatingDto
    {
        public Guid Id { get; set; }
        public Guid TokenId { get; set; }
        public string PatientName { get; set; } = string.Empty;
        public int Score { get; set; }
        public string? Comment { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class DoctorRatingsSummaryDto
    {
        public Guid DoctorId { get; set; }
        public double AverageScore { get; set; }
        public int TotalRatings { get; set; }
        public List<DoctorRatingDto> RecentRatings { get; set; } = new();
    }

    public class GetDoctorRatingsQuery : IRequest<DoctorRatingsSummaryDto>
    {
        public Guid DoctorId { get; set; }
    }

    public class GetDoctorRatingsQueryHandler : IRequestHandler<GetDoctorRatingsQuery, DoctorRatingsSummaryDto>
    {
        private readonly IApplicationDbContext _context;

        public GetDoctorRatingsQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<DoctorRatingsSummaryDto> Handle(GetDoctorRatingsQuery request, CancellationToken cancellationToken)
        {
            var ratingsQuery = _context.Ratings
                .Include(r => r.Token)
                .ThenInclude(t => t.Queue)
                .Include(r => r.Token)
                .ThenInclude(t => t.Patient)
                .Where(r => r.Token.Queue.DoctorId == request.DoctorId)
                .OrderByDescending(r => r.CreatedAt);

            var totalRatings = await ratingsQuery.CountAsync(cancellationToken);
            
            if (totalRatings == 0)
            {
                return new DoctorRatingsSummaryDto
                {
                    DoctorId = request.DoctorId,
                    AverageScore = 0,
                    TotalRatings = 0
                };
            }

            var averageScore = await ratingsQuery.AverageAsync(r => r.Score, cancellationToken);
            
            var recentRatings = await ratingsQuery
                .Take(20) // Get top 20 recent ratings
                .Select(r => new DoctorRatingDto
                {
                    Id = r.Id,
                    TokenId = r.TokenId,
                    PatientName = r.Token.Patient.Name,
                    Score = r.Score,
                    Comment = r.Comment,
                    CreatedAt = r.CreatedAt
                })
                .ToListAsync(cancellationToken);

            return new DoctorRatingsSummaryDto
            {
                DoctorId = request.DoctorId,
                AverageScore = Math.Round(averageScore, 1),
                TotalRatings = totalRatings,
                RecentRatings = recentRatings
            };
        }
    }
}
