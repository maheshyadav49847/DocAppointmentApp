using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Enums;
using CodeX.Application.Common.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CodeX.Application.Features.Billing.Invoices.Queries.GetPendingBills
{
    public record GetPendingBillsQuery(Guid BranchId, DateTime StartDate, DateTime EndDate, string? SearchTerm, int Page, int PageSize) : IRequest<PaginatedList<PendingBillDto>>;

    public class PendingBillDto
    {
        public Guid TokenId { get; set; }
        public string TokenReferenceId { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public Guid PatientId { get; set; }
        public string DoctorName { get; set; } = string.Empty;
        public Guid DoctorId { get; set; }
        public DateTime CompletedAt { get; set; }
    }

    public class GetPendingBillsQueryHandler : IRequestHandler<GetPendingBillsQuery, PaginatedList<PendingBillDto>>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public GetPendingBillsQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<PaginatedList<PendingBillDto>> Handle(GetPendingBillsQuery request, CancellationToken cancellationToken)
        {
            var query = _context.Tokens
                .Include(t => t.Patient)
                .Include(t => t.Queue).ThenInclude(q => q.Doctor)
                .Where(t => t.Queue.BranchId == request.BranchId 
                         && t.OrganizationId == _currentUserService.OrgId
                         && t.Status == TokenStatus.Completed
                         && t.BookedAt.Date >= request.StartDate.Date && t.BookedAt.Date <= request.EndDate.Date
                         && !t.Invoices.Any(i => i.Status != InvoiceStatus.Cancelled));

            if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            {
                var search = request.SearchTerm.ToLower();
                query = query.Where(t => 
                    (t.Patient != null && t.Patient.Name.ToLower().Contains(search)) ||
                    (t.Queue != null && t.Queue.Doctor != null && t.Queue.Doctor.Name.ToLower().Contains(search)) ||
                    (t.Id.ToString().ToLower().Contains(search))
                );
            }

            var orderedQuery = query.OrderByDescending(t => t.CompletedAt ?? t.BookedAt);

            var paginatedTokens = await PaginatedList<CodeX.Domain.Entities.Token>.CreateAsync(orderedQuery, request.Page, request.PageSize);
            
            var items = paginatedTokens.Items.Select(t => new PendingBillDto
            {
                TokenId = t.Id,
                TokenReferenceId = $"CX-{t.Id.ToString().Substring(0, 6).ToUpper()}",
                PatientName = t.Patient?.Name ?? "Unknown",
                PatientId = t.PatientId,
                DoctorName = t.Queue?.Doctor?.Name ?? "Unknown",
                DoctorId = t.Queue?.DoctorId ?? Guid.Empty,
                CompletedAt = t.CompletedAt ?? t.BookedAt
            }).ToList();

            return new PaginatedList<PendingBillDto>(items, paginatedTokens.TotalCount, request.Page, request.PageSize);
        }
    }
}
