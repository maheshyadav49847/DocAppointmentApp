using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace CodeX.Application.Features.Ratings.Commands.CreateRating
{
    public class CreateRatingCommand : IRequest<Guid>
    {
        public Guid TokenId { get; set; }
        public int Score { get; set; }
        public string? Comment { get; set; }
    }

    public class CreateRatingCommandHandler : IRequestHandler<CreateRatingCommand, Guid>
    {
        private readonly IApplicationDbContext _context;

        public CreateRatingCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Guid> Handle(CreateRatingCommand request, CancellationToken cancellationToken)
        {
            // IgnoreQueryFilters: called from WhatsApp webhook (anonymous context)
            var token = await _context.Tokens.IgnoreQueryFilters().FirstOrDefaultAsync(t => !t.IsDeleted && t.Id == request.TokenId, cancellationToken);
            if (token == null)
            {
                throw new Exception("Token not found.");
            }

            if (token.Status != CodeX.Domain.Enums.TokenStatus.Completed)
            {
                throw new Exception("You can only rate a completed visit.");
            }

            // Check if rating already exists (IgnoreQueryFilters for anonymous context)
            var existingRating = await _context.Ratings.IgnoreQueryFilters().FirstOrDefaultAsync(r => !r.IsDeleted && r.TokenId == request.TokenId, cancellationToken);
            if (existingRating != null)
            {
                throw new Exception("You have already submitted a rating for this visit.");
            }

            var rating = new Rating
            {
                Id = Guid.NewGuid(),
                TokenId = request.TokenId,
                Score = request.Score < 1 ? 1 : (request.Score > 5 ? 5 : request.Score),
                Comment = request.Comment,
                CreatedAt = DateTime.UtcNow
            };

            _context.Ratings.Add(rating);
            await _context.SaveChangesAsync(cancellationToken);

            return rating.Id;
        }
    }
}
