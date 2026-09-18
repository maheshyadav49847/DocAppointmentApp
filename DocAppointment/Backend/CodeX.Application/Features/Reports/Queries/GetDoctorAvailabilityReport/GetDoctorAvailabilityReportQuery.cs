using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Application.Features.Reports.Queries.GetDoctorAvailabilityReport
{
    public class DoctorAvailabilityRowDto
    {
        public Guid DoctorId { get; set; }
        public string DoctorName { get; set; } = string.Empty;
        public string Specialization { get; set; } = string.Empty;
        public string BranchName { get; set; } = string.Empty;
        public int TotalScheduledSessions { get; set; }
        public int SessionsAttended { get; set; }
        public int SessionsSuspended { get; set; }
        public int PlannedLeavesCount { get; set; }
        public int EmergencyLeavesCount { get; set; }
        public int TotalLeaveDays { get; set; }
        public int CancelledTokensCount { get; set; }
        public double ReliabilityRate { get; set; }
    }

    public class DoctorAvailabilityReportDto
    {
        public int TotalDoctorsCount { get; set; }
        public double OverallOPDAttendanceRate { get; set; }
        public int TotalScheduledSessions { get; set; }
        public int TotalSessionsAttended { get; set; }
        public int TotalSessionsSuspended { get; set; }
        public int TotalLeaveDaysTaken { get; set; }
        public int TotalPlannedLeaves { get; set; }
        public int TotalEmergencyLeaves { get; set; }
        public int TotalAppointmentsCancelledDueToLeave { get; set; }
        public List<DoctorAvailabilityRowDto> DetailedRows { get; set; } = new();
    }

    public class GetDoctorAvailabilityReportQuery : IRequest<DoctorAvailabilityReportDto>
    {
        public Guid OrganizationId { get; set; }
        public Guid? BranchId { get; set; }
        public Guid? DoctorId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
    }

    public class GetDoctorAvailabilityReportQueryHandler : IRequestHandler<GetDoctorAvailabilityReportQuery, DoctorAvailabilityReportDto>
    {
        private readonly IApplicationDbContext _context;

        public GetDoctorAvailabilityReportQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<DoctorAvailabilityReportDto> Handle(GetDoctorAvailabilityReportQuery request, CancellationToken cancellationToken)
        {
            var startUtc = DateTime.SpecifyKind(request.StartDate.Date, DateTimeKind.Utc);
            var endUtc = DateTime.SpecifyKind(request.EndDate.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);

            // Fetch organization doctors
            var doctorsQuery = _context.Doctors
                .Where(d => d.OrganizationId == request.OrganizationId && !d.IsDeleted && d.IsActive)
                .AsQueryable();

            if (request.DoctorId.HasValue && request.DoctorId.Value != Guid.Empty)
            {
                doctorsQuery = doctorsQuery.Where(d => d.Id == request.DoctorId.Value);
            }

            if (request.BranchId.HasValue && request.BranchId.Value != Guid.Empty)
            {
                doctorsQuery = doctorsQuery.Where(d => d.Branches.Any(b => b.Id == request.BranchId.Value));
            }

            var doctors = await doctorsQuery
                .Select(d => new
                {
                    d.Id,
                    d.Name,
                    d.Specialization,
                    BranchName = d.Branches.Select(b => b.Name).FirstOrDefault() ?? "All Branches"
                })
                .ToListAsync(cancellationToken);

            var doctorIds = doctors.Select(d => d.Id).ToList();

            // Fetch doctor sessions
            var sessions = await _context.Sessions
                .Where(s => doctorIds.Contains(s.DoctorId) && !s.IsDeleted)
                .Select(s => new
                {
                    s.Id,
                    s.DoctorId,
                    s.BranchId,
                    s.DayOfWeek,
                    s.IsDaily,
                    s.SessionName
                })
                .ToListAsync(cancellationToken);

            // Fetch leaves for these doctors in date range
            var leaves = await _context.LeaveRecords
                .Where(l => l.OrganizationId == request.OrganizationId
                            && !l.IsDeleted
                            && l.DoctorId.HasValue
                            && doctorIds.Contains(l.DoctorId.Value)
                            && (l.Status == LeaveStatus.Approved || (l.Status == LeaveStatus.Pending && l.LeaveType == LeaveType.Unplanned))
                            && l.StartDate <= endUtc
                            && l.EndDate >= startUtc)
                .Select(l => new
                {
                    DoctorId = l.DoctorId!.Value,
                    l.LeaveType,
                    l.StartDate,
                    l.EndDate,
                    l.SessionId,
                    l.AffectedTokensCount
                })
                .ToListAsync(cancellationToken);

            // Calculate dates range days
            int totalCalendarDays = Math.Max(1, (int)(request.EndDate.Date - request.StartDate.Date).TotalDays + 1);
            var dateList = new List<DateTime>();
            for (int i = 0; i < totalCalendarDays; i++)
            {
                dateList.Add(request.StartDate.Date.AddDays(i));
            }

            var detailedRows = new List<DoctorAvailabilityRowDto>();

            foreach (var doc in doctors)
            {
                var docSessions = sessions.Where(s => s.DoctorId == doc.Id).ToList();
                var docLeaves = leaves.Where(l => l.DoctorId == doc.Id).ToList();

                // Calculate total scheduled shifts in range
                int scheduledSessionsCount = 0;
                if (docSessions.Count > 0)
                {
                    foreach (var d in dateList)
                    {
                        int dayOfWeekInt = (int)d.DayOfWeek;
                        scheduledSessionsCount += docSessions.Count(s => s.IsDaily || s.DayOfWeek == dayOfWeekInt);
                    }
                }
                else
                {
                    // Default to 1 session per day if no specific shifts configured
                    scheduledSessionsCount = totalCalendarDays;
                }

                // Calculate leaves impact
                int plannedCount = 0;
                int emergencyCount = 0;
                int suspendedSessionsCount = 0;
                int cancelledTokens = 0;

                foreach (var leave in docLeaves)
                {
                    var leaveStart = leave.StartDate.Date < request.StartDate.Date ? request.StartDate.Date : leave.StartDate.Date;
                    var leaveEnd = leave.EndDate.Date > request.EndDate.Date ? request.EndDate.Date : leave.EndDate.Date;
                    int daysInWindow = Math.Max(1, (int)(leaveEnd - leaveStart).TotalDays + 1);

                    if (leave.LeaveType == LeaveType.Planned)
                    {
                        plannedCount += daysInWindow;
                    }
                    else
                    {
                        emergencyCount += daysInWindow;
                    }

                    cancelledTokens += leave.AffectedTokensCount;

                    // Calculate affected sessions
                    if (leave.SessionId.HasValue)
                    {
                        suspendedSessionsCount += daysInWindow;
                    }
                    else if (docSessions.Count > 0)
                    {
                        for (var cur = leaveStart; cur <= leaveEnd; cur = cur.AddDays(1))
                        {
                            int dayOfWeekInt = (int)cur.DayOfWeek;
                            suspendedSessionsCount += docSessions.Count(s => s.IsDaily || s.DayOfWeek == dayOfWeekInt);
                        }
                    }
                    else
                    {
                        suspendedSessionsCount += daysInWindow;
                    }
                }

                suspendedSessionsCount = Math.Min(scheduledSessionsCount, suspendedSessionsCount);
                int attendedSessions = Math.Max(0, scheduledSessionsCount - suspendedSessionsCount);
                double reliability = scheduledSessionsCount > 0 
                    ? Math.Round(((double)attendedSessions / scheduledSessionsCount) * 100.0, 1) 
                    : 100.0;

                detailedRows.Add(new DoctorAvailabilityRowDto
                {
                    DoctorId = doc.Id,
                    DoctorName = doc.Name,
                    Specialization = doc.Specialization,
                    BranchName = doc.BranchName,
                    TotalScheduledSessions = scheduledSessionsCount,
                    SessionsAttended = attendedSessions,
                    SessionsSuspended = suspendedSessionsCount,
                    PlannedLeavesCount = plannedCount,
                    EmergencyLeavesCount = emergencyCount,
                    TotalLeaveDays = plannedCount + emergencyCount,
                    CancelledTokensCount = cancelledTokens,
                    ReliabilityRate = reliability
                });
            }

            int totalScheduled = detailedRows.Sum(r => r.TotalScheduledSessions);
            int totalAttended = detailedRows.Sum(r => r.SessionsAttended);
            int totalSuspended = detailedRows.Sum(r => r.SessionsSuspended);
            int totalPlanned = detailedRows.Sum(r => r.PlannedLeavesCount);
            int totalEmergency = detailedRows.Sum(r => r.EmergencyLeavesCount);
            int totalTokensCancelled = detailedRows.Sum(r => r.CancelledTokensCount);
            double overallRate = totalScheduled > 0 
                ? Math.Round(((double)totalAttended / totalScheduled) * 100.0, 1) 
                : 100.0;

            return new DoctorAvailabilityReportDto
            {
                TotalDoctorsCount = detailedRows.Count,
                OverallOPDAttendanceRate = overallRate,
                TotalScheduledSessions = totalScheduled,
                TotalSessionsAttended = totalAttended,
                TotalSessionsSuspended = totalSuspended,
                TotalLeaveDaysTaken = totalPlanned + totalEmergency,
                TotalPlannedLeaves = totalPlanned,
                TotalEmergencyLeaves = totalEmergency,
                TotalAppointmentsCancelledDueToLeave = totalTokensCancelled,
                DetailedRows = detailedRows.OrderBy(r => r.ReliabilityRate).ThenByDescending(r => r.TotalLeaveDays).ToList()
            };
        }
    }
}
