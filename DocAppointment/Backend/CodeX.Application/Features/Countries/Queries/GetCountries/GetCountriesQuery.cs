using CodeX.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

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
        private readonly IMemoryCache _cache;
        private const string CacheKey = "CountriesList";

        public GetCountriesQueryHandler(IApplicationDbContext context, IMemoryCache cache)
        {
            _context = context;
            _cache = cache;
        }

        public async Task<List<CountryDto>> Handle(GetCountriesQuery request, CancellationToken cancellationToken)
        {
            if (!_cache.TryGetValue(CacheKey, out List<CountryDto>? countries) || countries == null)
            {
                countries = await _context.Countries
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

                // Cache for 24 hours since countries rarely change
                var cacheEntryOptions = new MemoryCacheEntryOptions()
                    .SetAbsoluteExpiration(TimeSpan.FromHours(24));

                _cache.Set(CacheKey, countries, cacheEntryOptions);
            }

            return countries;
        }
    }
}
