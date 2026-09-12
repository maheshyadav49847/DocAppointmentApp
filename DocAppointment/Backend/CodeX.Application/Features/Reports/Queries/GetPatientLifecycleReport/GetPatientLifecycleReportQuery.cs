using CodeX.Application.Common.Interfaces;
using CodeX.Application.Common.Models;
using CodeX.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CodeX.Application.Features.Reports.Queries.GetPatientLifecycleReport
{
    public class PatientLifecycleItemDto
    {
        // 1. Patient Info
        public Guid PatientId { get; set; }
        public string PatientCode { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Gender { get; set; }
        public string? Age { get; set; }

        // 2. Token & Booking Stage
        public Guid TokenId { get; set; }
        public string TokenReferenceId { get; set; } = string.Empty;
        public int TokenNumber { get; set; }
        public string BookingSource { get; set; } = string.Empty;
        public DateTime BookedAt { get; set; }
        public string TokenStatus { get; set; } = string.Empty;
        public bool IsPriority { get; set; }

        // Clinic & Doctor Details
        public Guid BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public Guid DoctorId { get; set; }
        public string DoctorName { get; set; } = string.Empty;
        public string SessionName { get; set; } = string.Empty;

        // 3. Queue & Wait Stage
        public DateTime? CalledAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public int WaitDurationMinutes { get; set; }
        public int ConsultDurationMinutes { get; set; }

        // 4. Consultation Stage
        public bool HasConsultation { get; set; }
        public Guid? VisitId { get; set; }
        public DateTime? VisitDate { get; set; }
        public string? Diagnosis { get; set; }
        public string? Symptoms { get; set; }
        public int MedicinesPrescribedCount { get; set; }
        public int ServicesPrescribedCount { get; set; }
        public DateTime? FollowUpDate { get; set; }

        // 5. Billing & Invoice Stage
        public bool HasInvoice { get; set; }
        public Guid? InvoiceId { get; set; }
        public string? InvoiceNumber { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public string InvoiceStatus { get; set; } = "Not Billed"; // Paid, Unpaid, PartiallyPaid, Cancelled, Not Billed
        public string? PaymentMode { get; set; }

        // 6. Outbox & Prescription Dispatch Stage
        public bool HasOutboxDispatch { get; set; }
        public Guid? OutboxId { get; set; }
        public string? OutboxChannel { get; set; } // "Telegram", "WhatsApp"
        public string? OutboxStatus { get; set; } // "Pending", "Processing", "Sent", "Failed", "DeadLetter"
        public DateTime? OutboxDeliveredAt { get; set; }
        public int OutboxRetryCount { get; set; }
        public string? OutboxErrorMessage { get; set; }

        // 7. Rating & Feedback Stage
        public bool HasRating { get; set; }
        public int? RatingScore { get; set; }
        public string? RatingComment { get; set; }

        // Overall Lifecycle Stage Indicator
        // "Booked" -> "Waiting" -> "InConsultation" -> "Consulted" -> "Billed" -> "Completed"
        public string CurrentStage { get; set; } = "Booked";
    }

    public class PatientLifecycleReportDto
    {
        public int TotalCount { get; set; }
        public int TotalBooked { get; set; }
        public int TotalConsulted { get; set; }
        public int TotalBilled { get; set; }
        public int TotalCancelled { get; set; }
        public decimal TotalRevenue { get; set; }
        public List<PatientLifecycleItemDto> Items { get; set; } = new();
    }

    public class GetPatientLifecycleReportQuery : IRequest<PatientLifecycleReportDto>
    {
        public Guid OrganizationId { get; set; }
        public Guid? BranchId { get; set; }
        public Guid? DoctorId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string? Search { get; set; }
        public string? Stage { get; set; } // All, Booked, InConsultation, Consulted, Billed, Cancelled
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 50;
    }

    public class GetPatientLifecycleReportQueryHandler : IRequestHandler<GetPatientLifecycleReportQuery, PatientLifecycleReportDto>
    {
        private readonly IApplicationDbContext _context;

        public GetPatientLifecycleReportQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<PatientLifecycleReportDto> Handle(GetPatientLifecycleReportQuery request, CancellationToken cancellationToken)
        {
            var baseQuery = _context.Tokens
                .Include(t => t.Patient)
                .Include(t => t.Queue).ThenInclude(q => q.Branch)
                .Include(t => t.Queue).ThenInclude(q => q.Doctor)
                .Include(t => t.Queue).ThenInclude(q => q.Session)
                .Include(t => t.Rating)
                .Include(t => t.Invoices).ThenInclude(i => i.Payments)
                .Where(t => t.OrganizationId == request.OrganizationId
                         && t.BookedAt >= request.StartDate
                         && t.BookedAt <= request.EndDate
                         && !t.IsDeleted);

            if (request.BranchId.HasValue && request.BranchId.Value != Guid.Empty)
            {
                baseQuery = baseQuery.Where(t => t.Queue.BranchId == request.BranchId.Value);
            }

            if (request.DoctorId.HasValue && request.DoctorId.Value != Guid.Empty)
            {
                baseQuery = baseQuery.Where(t => t.Queue.DoctorId == request.DoctorId.Value);
            }

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var s = request.Search.Trim().ToLower();
                baseQuery = baseQuery.Where(t =>
                    t.Patient.Name.ToLower().Contains(s) ||
                    (t.Patient.Phone != null && t.Patient.Phone.Contains(s)) ||
                    t.Patient.PatientCode.ToLower().Contains(s) ||
                    t.Id.ToString().ToLower().Contains(s) ||
                    t.Invoices.Any(i => i.InvoiceNumber.ToLower().Contains(s)));
            }

            var tokens = await baseQuery
                .OrderByDescending(t => t.BookedAt)
                .ToListAsync(cancellationToken);

            var tokenIds = tokens.Select(t => t.Id).ToList();

            // Pre-fetch linked consultations for these tokens
            var visits = await _context.PatientVisits
                .Include(v => v.Medicines)
                .Include(v => v.Services)
                .Where(v => v.TokenId.HasValue && tokenIds.Contains(v.TokenId.Value))
                .ToListAsync(cancellationToken);

            var visitMap = visits.ToDictionary(v => v.TokenId!.Value, v => v);
            var visitIds = visits.Select(v => v.Id).ToList();

            // Pre-fetch linked outbox messages for these tokens and visits
            var outboxMessages = await _context.OutboxMessages
                .IgnoreQueryFilters()
                .Where(o => !o.IsDeleted && 
                            ((o.TokenId.HasValue && tokenIds.Contains(o.TokenId.Value)) || 
                             (o.PatientVisitId.HasValue && visitIds.Contains(o.PatientVisitId.Value))))
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync(cancellationToken);

            var outboxByToken = outboxMessages
                .Where(o => o.TokenId.HasValue)
                .GroupBy(o => o.TokenId!.Value)
                .ToDictionary(g => g.Key, g => g.First());

            var outboxByVisit = outboxMessages
                .Where(o => o.PatientVisitId.HasValue)
                .GroupBy(o => o.PatientVisitId!.Value)
                .ToDictionary(g => g.Key, g => g.First());

            var resultItems = new List<PatientLifecycleItemDto>();

            int countBooked = 0;
            int countConsulted = 0;
            int countBilled = 0;
            int countCancelled = 0;
            decimal totalRevenue = 0;

            foreach (var t in tokens)
            {
                visitMap.TryGetValue(t.Id, out var visit);
                var activeInvoice = t.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault(i => i.Status != InvoiceStatus.Cancelled);

                // Calculations
                int waitMinutes = 0;
                if (t.CalledAt.HasValue)
                {
                    waitMinutes = Math.Max(0, (int)(t.CalledAt.Value - t.BookedAt).TotalMinutes);
                }
                else if (t.CompletedAt.HasValue)
                {
                    waitMinutes = Math.Max(0, (int)(t.CompletedAt.Value - t.BookedAt).TotalMinutes);
                }

                int consultMinutes = 0;
                if (t.CalledAt.HasValue && t.CompletedAt.HasValue)
                {
                    consultMinutes = Math.Max(0, (int)(t.CompletedAt.Value - t.CalledAt.Value).TotalMinutes);
                }

                // Determine Lifecycle Stage
                string currentStage = "Booked";
                if (t.Status == TokenStatus.Cancelled)
                {
                    currentStage = "Cancelled";
                    countCancelled++;
                }
                else if (activeInvoice != null && (activeInvoice.Status == InvoiceStatus.Paid || activeInvoice.PaidAmount >= activeInvoice.TotalAmount))
                {
                    currentStage = "Completed";
                    countConsulted++;
                    countBilled++;
                }
                else if (activeInvoice != null)
                {
                    currentStage = "Billed";
                    countConsulted++;
                    countBilled++;
                }
                else if (visit != null || t.Status == TokenStatus.Completed)
                {
                    currentStage = "Consulted";
                    countConsulted++;
                }
                else if (t.Status == TokenStatus.Called)
                {
                    currentStage = "InConsultation";
                    countBooked++;
                }
                else if (t.Status == TokenStatus.Pending)
                {
                    currentStage = "Waiting";
                    countBooked++;
                }

                if (activeInvoice != null)
                {
                    totalRevenue += activeInvoice.PaidAmount;
                }

                // Resolve linked outbox message (by VisitId or TokenId)
                CodeX.Domain.Entities.OutboxMessage? linkedOutbox = null;
                if (visit != null && outboxByVisit.TryGetValue(visit.Id, out var outboxV))
                {
                    linkedOutbox = outboxV;
                }
                else if (outboxByToken.TryGetValue(t.Id, out var outboxT))
                {
                    linkedOutbox = outboxT;
                }

                var item = new PatientLifecycleItemDto
                {
                    PatientId = t.PatientId,
                    PatientCode = t.Patient?.PatientCode ?? $"PT-{t.PatientId.ToString().Substring(0, 6).ToUpper()}",
                    PatientName = t.Patient?.Name ?? "Unknown",
                    Phone = t.Patient?.Phone,
                    Gender = t.Patient?.Gender,
                    Age = t.Patient?.Age,

                    TokenId = t.Id,
                    TokenReferenceId = $"CX-{t.Id.ToString().Substring(0, 6).ToUpper()}",
                    TokenNumber = t.TokenNumber,
                    BookingSource = t.Source.ToString(),
                    BookedAt = t.BookedAt,
                    TokenStatus = t.Status.ToString(),
                    IsPriority = t.IsPriority,

                    BranchId = t.Queue?.BranchId ?? Guid.Empty,
                    BranchName = t.Queue?.Branch?.Name ?? "Default Branch",
                    DoctorId = t.Queue?.DoctorId ?? Guid.Empty,
                    DoctorName = t.Queue?.Doctor?.Name ?? "Doctor",
                    SessionName = t.Queue?.Session?.SessionName ?? "General OPD",

                    CalledAt = t.CalledAt,
                    CompletedAt = t.CompletedAt,
                    WaitDurationMinutes = waitMinutes,
                    ConsultDurationMinutes = consultMinutes,

                    HasConsultation = visit != null,
                    VisitId = visit?.Id,
                    VisitDate = visit?.VisitDate,
                    Diagnosis = visit?.Diagnosis,
                    Symptoms = visit?.Symptoms,
                    MedicinesPrescribedCount = visit?.Medicines?.Count ?? 0,
                    ServicesPrescribedCount = visit?.Services?.Count ?? 0,
                    FollowUpDate = visit?.FollowUpDate,

                    HasInvoice = activeInvoice != null,
                    InvoiceId = activeInvoice?.Id,
                    InvoiceNumber = activeInvoice?.InvoiceNumber,
                    TotalAmount = activeInvoice?.TotalAmount ?? 0,
                    PaidAmount = activeInvoice?.PaidAmount ?? 0,
                    DiscountAmount = activeInvoice?.DiscountAmount ?? 0,
                    InvoiceStatus = activeInvoice != null ? activeInvoice.Status.ToString() : "Not Billed",
                    PaymentMode = activeInvoice?.Payments.OrderByDescending(p => p.CreatedAt).FirstOrDefault()?.PaymentMode.ToString(),

                    // Outbox Details
                    HasOutboxDispatch = linkedOutbox != null,
                    OutboxId = linkedOutbox?.Id,
                    OutboxChannel = linkedOutbox?.Channel,
                    OutboxStatus = linkedOutbox?.Status,
                    OutboxDeliveredAt = linkedOutbox?.ProcessedAtUtc,
                    OutboxRetryCount = linkedOutbox?.RetryCount ?? 0,
                    OutboxErrorMessage = linkedOutbox?.ErrorMessage,

                    HasRating = t.Rating != null,
                    RatingScore = t.Rating?.Score,
                    RatingComment = t.Rating?.Comment,

                    CurrentStage = currentStage
                };

                // Filter by stage if specified
                if (string.IsNullOrWhiteSpace(request.Stage) || request.Stage.Equals("All", StringComparison.OrdinalIgnoreCase) ||
                    item.CurrentStage.Equals(request.Stage, StringComparison.OrdinalIgnoreCase))
                {
                    resultItems.Add(item);
                }
            }

            var pagedItems = resultItems
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .ToList();

            return new PatientLifecycleReportDto
            {
                TotalCount = resultItems.Count,
                TotalBooked = countBooked,
                TotalConsulted = countConsulted,
                TotalBilled = countBilled,
                TotalCancelled = countCancelled,
                TotalRevenue = totalRevenue,
                Items = pagedItems
            };
        }
    }
}
