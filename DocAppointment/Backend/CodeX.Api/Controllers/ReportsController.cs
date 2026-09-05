using CodeX.Api.Authorization;
using CodeX.Application.Common.Interfaces;
using CodeX.Application.Features.Reports.Queries.GetBranchAnalytics;
using CodeX.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CodeX.Application.Features.Reports.Queries.GetDoctorRevenueReport;
using CodeX.Application.Features.Reports.Queries.GetServiceRevenueReport;
using CodeX.Application.Features.Reports.Queries.GetOutstandingDuesReport;

using CodeX.Application.Features.Reports.Queries.GetDailyCollectionReport;
using CodeX.Application.Features.Reports.Queries.GetFootfallAnalysisReport;
using CodeX.Application.Features.Reports.Queries.GetAppointmentSummaryReport;
using CodeX.Application.Features.Reports.Queries.GetQueueWaitTimeReport;
using CodeX.Application.Features.Reports.Queries.GetStaffProductivityReport;
using CodeX.Application.Features.Reports.Queries.GetDiagnosisSummaryReport;
using CodeX.Application.Features.Reports.Queries.GetPatientDemographicsReport;
using CodeX.Application.Features.Reports.Queries.GetNewVsReturningReport;
using CodeX.Application.Features.Reports.Queries.GetReferralTrackingReport;



namespace CodeX.Api.Controllers
{
    [Authorize]
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/[controller]")]
    public class ReportsController : BaseApiController
    {
        private readonly ICurrentUserService _currentUserService;

        public ReportsController(ICurrentUserService currentUserService)
        {
            _currentUserService = currentUserService;
        }

        [HttpGet("branches")]
        [HasPermission(SystemPermissions.Analytics.View)]
        public async Task<ActionResult<List<CodeX.Domain.Entities.Branch>>> GetBranches()
        {
            return await Mediator.Send(new CodeX.Application.Features.Branches.Queries.GetBranches.GetBranchesQuery());
        }

        [HttpGet("branch-analytics")]
        [HasPermission(SystemPermissions.Analytics.View)]
        public async Task<ActionResult<BranchAnalyticsDto>> GetBranchAnalytics(
            [FromQuery] Guid? branchId,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            var orgId = _currentUserService.OrgId;

            var isSuperAdmin = _currentUserService.OrgId == Guid.Empty;

            // Default to last 30 days if no dates provided
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            // Enforcement: If user is branch-specific, they can only see their own branch
            var effectiveBranchId = branchId;
            if (_currentUserService.BranchId.HasValue)
            {
                effectiveBranchId = _currentUserService.BranchId;
            }

            return await Mediator.Send(new GetBranchAnalyticsQuery(orgId, effectiveBranchId, start, end, isSuperAdmin));
        }

        [HttpGet("daily-collection")]
        [HasPermission(SystemPermissions.Analytics.View)]
        public async Task<ActionResult<DailyCollectionReportDto>> GetDailyCollectionReport(
            [FromQuery] Guid? branchId,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            var orgId = _currentUserService.OrgId;
            var start = startDate ?? DateTime.UtcNow.Date;
            var end = endDate ?? DateTime.UtcNow.Date.AddDays(1).AddTicks(-1);

            var effectiveBranchId = branchId;
            if (_currentUserService.BranchId.HasValue)
            {
                effectiveBranchId = _currentUserService.BranchId;
            }

            return await Mediator.Send(new GetDailyCollectionReportQuery
            {
                OrganizationId = orgId,
                BranchId = effectiveBranchId,
                StartDate = start,
                EndDate = end
            });
        }

        [HttpGet("doctor-revenue")]
        [HasPermission(SystemPermissions.Analytics.View)]
        public async Task<ActionResult<DoctorRevenueReportDto>> GetDoctorRevenueReport(
            [FromQuery] Guid? branchId,
            [FromQuery] Guid? doctorId,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            var orgId = _currentUserService.OrgId;
            var start = startDate ?? DateTime.UtcNow.Date;
            var end = endDate ?? DateTime.UtcNow.Date.AddDays(1).AddTicks(-1);

            var effectiveBranchId = branchId;
            if (_currentUserService.BranchId.HasValue)
            {
                effectiveBranchId = _currentUserService.BranchId;
            }

            return await Mediator.Send(new GetDoctorRevenueReportQuery
            {
                OrganizationId = orgId,
                BranchId = effectiveBranchId,
                DoctorId = doctorId,
                StartDate = start,
                EndDate = end
            });
        }

        [HttpGet("service-revenue")]
        [HasPermission(SystemPermissions.Analytics.View)]
        public async Task<ActionResult<ServiceRevenueReportDto>> GetServiceRevenueReport(
            [FromQuery] Guid? branchId,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            var orgId = _currentUserService.OrgId;
            var start = startDate ?? DateTime.UtcNow.Date;
            var end = endDate ?? DateTime.UtcNow.Date.AddDays(1).AddTicks(-1);

            var effectiveBranchId = branchId;
            if (_currentUserService.BranchId.HasValue)
            {
                effectiveBranchId = _currentUserService.BranchId;
            }

            return await Mediator.Send(new GetServiceRevenueReportQuery
            {
                OrganizationId = orgId,
                BranchId = effectiveBranchId,
                StartDate = start,
                EndDate = end
            });
        }

        [HttpGet("outstanding-dues")]
        [HasPermission(SystemPermissions.Analytics.View)]
        public async Task<ActionResult<OutstandingDuesReportDto>> GetOutstandingDuesReport(
            [FromQuery] Guid? branchId)
        {
            var orgId = _currentUserService.OrgId;

            var effectiveBranchId = branchId;
            if (_currentUserService.BranchId.HasValue)
            {
                effectiveBranchId = _currentUserService.BranchId;
            }

            return await Mediator.Send(new GetOutstandingDuesReportQuery
            {
                OrganizationId = orgId,
                BranchId = effectiveBranchId
            });
        }

        [HttpGet("operational/footfall")]
        [HasPermission(SystemPermissions.Analytics.View)]
        public async Task<ActionResult<FootfallAnalysisReportDto>> GetFootfallAnalysisReport(
            [FromQuery] Guid? branchId,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            var orgId = _currentUserService.OrgId;
            var start = startDate ?? DateTime.UtcNow.Date;
            var end = endDate ?? DateTime.UtcNow.Date.AddDays(1).AddTicks(-1);
            var effectiveBranchId = _currentUserService.BranchId ?? branchId;

            return await Mediator.Send(new GetFootfallAnalysisReportQuery
            {
                OrganizationId = orgId,
                BranchId = effectiveBranchId,
                StartDate = start,
                EndDate = end
            });
        }

        [HttpGet("operational/appointment-summary")]
        [HasPermission(SystemPermissions.Analytics.View)]
        public async Task<ActionResult<AppointmentSummaryReportDto>> GetAppointmentSummaryReport(
            [FromQuery] Guid? branchId,
            [FromQuery] Guid? doctorId,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            var orgId = _currentUserService.OrgId;
            var start = startDate ?? DateTime.UtcNow.Date;
            var end = endDate ?? DateTime.UtcNow.Date.AddDays(1).AddTicks(-1);
            var effectiveBranchId = _currentUserService.BranchId ?? branchId;

            return await Mediator.Send(new GetAppointmentSummaryReportQuery
            {
                OrganizationId = orgId,
                BranchId = effectiveBranchId,
                DoctorId = doctorId,
                StartDate = start,
                EndDate = end
            });
        }

        [HttpGet("operational/queue-wait-time")]
        [HasPermission(SystemPermissions.Analytics.View)]
        public async Task<ActionResult<QueueWaitTimeReportDto>> GetQueueWaitTimeReport(
            [FromQuery] Guid? branchId,
            [FromQuery] Guid? doctorId,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            var orgId = _currentUserService.OrgId;
            var start = startDate ?? DateTime.UtcNow.Date;
            var end = endDate ?? DateTime.UtcNow.Date.AddDays(1).AddTicks(-1);
            var effectiveBranchId = _currentUserService.BranchId ?? branchId;

            return await Mediator.Send(new GetQueueWaitTimeReportQuery
            {
                OrganizationId = orgId,
                BranchId = effectiveBranchId,
                DoctorId = doctorId,
                StartDate = start,
                EndDate = end
            });
        }

        [HttpGet("operational/staff-productivity")]
        [HasPermission(SystemPermissions.Analytics.View)]
        public async Task<ActionResult<StaffProductivityReportDto>> GetStaffProductivityReport(
            [FromQuery] Guid? branchId,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            var orgId = _currentUserService.OrgId;
            var start = startDate ?? DateTime.UtcNow.Date;
            var end = endDate ?? DateTime.UtcNow.Date.AddDays(1).AddTicks(-1);
            var effectiveBranchId = _currentUserService.BranchId ?? branchId;

            return await Mediator.Send(new GetStaffProductivityReportQuery
            {
                OrganizationId = orgId,
                BranchId = effectiveBranchId,
                StartDate = start,
                EndDate = end
            });
        }

        [HttpGet("clinical/diagnosis-summary")]
        [HasPermission(SystemPermissions.Analytics.View)]
        public async Task<ActionResult<DiagnosisSummaryReportDto>> GetDiagnosisSummaryReport(
            [FromQuery] Guid? branchId,
            [FromQuery] Guid? doctorId,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            var orgId = _currentUserService.OrgId;
            var start = startDate ?? DateTime.UtcNow.Date;
            var end = endDate ?? DateTime.UtcNow.Date.AddDays(1).AddTicks(-1);
            var effectiveBranchId = _currentUserService.BranchId ?? branchId;

            return await Mediator.Send(new GetDiagnosisSummaryReportQuery
            {
                OrganizationId = orgId,
                BranchId = effectiveBranchId,
                DoctorId = doctorId,
                StartDate = start,
                EndDate = end
            });
        }

        [HttpGet("clinical/patient-demographics")]
        [HasPermission(SystemPermissions.Analytics.View)]
        public async Task<ActionResult<PatientDemographicsReportDto>> GetPatientDemographicsReport(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            var orgId = _currentUserService.OrgId;
            var start = startDate ?? DateTime.UtcNow.Date;
            var end = endDate ?? DateTime.UtcNow.Date.AddDays(1).AddTicks(-1);

            return await Mediator.Send(new GetPatientDemographicsReportQuery
            {
                OrganizationId = orgId,
                StartDate = start,
                EndDate = end
            });
        }

        [HttpGet("clinical/new-vs-returning")]
        [HasPermission(SystemPermissions.Analytics.View)]
        public async Task<ActionResult<NewVsReturningReportDto>> GetNewVsReturningReport(
            [FromQuery] Guid? branchId,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            var orgId = _currentUserService.OrgId;
            var start = startDate ?? DateTime.UtcNow.Date;
            var end = endDate ?? DateTime.UtcNow.Date.AddDays(1).AddTicks(-1);
            var effectiveBranchId = _currentUserService.BranchId ?? branchId;

            return await Mediator.Send(new GetNewVsReturningReportQuery
            {
                OrganizationId = orgId,
                BranchId = effectiveBranchId,
                StartDate = start,
                EndDate = end
            });
        }

        [HttpGet("clinical/referral-tracking")]
        [HasPermission(SystemPermissions.Analytics.View)]
        public async Task<ActionResult<ReferralTrackingReportDto>> GetReferralTrackingReport(
            [FromQuery] Guid? branchId,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            var orgId = _currentUserService.OrgId;
            var start = startDate ?? DateTime.UtcNow.Date;
            var end = endDate ?? DateTime.UtcNow.Date.AddDays(1).AddTicks(-1);
            var effectiveBranchId = _currentUserService.BranchId ?? branchId;

            return await Mediator.Send(new GetReferralTrackingReportQuery
            {
                OrganizationId = orgId,
                BranchId = effectiveBranchId,
                StartDate = start,
                EndDate = end
            });
        }
    }
}
