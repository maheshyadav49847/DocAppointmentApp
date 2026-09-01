using CodeX.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Application.Features.Countries.Queries.GetCountries
{
    public record CountryDto
    {
        public string Name { get; init; } = string.Empty;
        public string IsoCode { get; init; } = string.Empty;
        public string DialCode { get; init; } = string.Empty;
        public string CurrencyCode { get; init; } = string.Empty;
        public string CurrencySymbol { get; init; } = string.Empty;
    }

    public record GetCountriesQuery : IRequest<List<CountryDto>>;

    public class GetCountriesQueryHandler : IRequestHandler<GetCountriesQuery, List<CountryDto>>
    {
        private readonly IApplicationDbContext _context;

        public GetCountriesQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<CountryDto>> Handle(GetCountriesQuery request, CancellationToken cancellationToken)
        {
            return await _context.Countries
                .Where(c => c.IsActive)
                .OrderBy(c => c.Name)
                .Select(c => new CountryDto
                {
                    Name = c.Name,
                    IsoCode = c.IsoCode,
                    DialCode = c.DialCode,
                    CurrencyCode = c.CurrencyCode,
                    CurrencySymbol = c.CurrencySymbol
                })
                .ToListAsync(cancellationToken);
        }
    }
}
