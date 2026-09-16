using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CodeX.Application.Common.Interfaces;
using CodeX.Application.Features.Onboarding.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Application.Features.Onboarding.Queries
{
    public record GetOnboardingStatusQuery : IRequest<OnboardingStatusDto>;

    public class GetOnboardingStatusQueryHandler : IRequestHandler<GetOnboardingStatusQuery, OnboardingStatusDto>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public GetOnboardingStatusQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<OnboardingStatusDto> Handle(GetOnboardingStatusQuery request, CancellationToken cancellationToken)
        {
            var orgId = _currentUserService.OrgId;
            if (orgId == Guid.Empty)
            {
                // Unscoped or global admin
                return new OnboardingStatusDto
                {
                    IsOnboarded = true,
                    HasBranch = true,
                    HasDoctor = true,
                    HasSession = true,
                    HasRateList = true,
                    CurrentStep = 4
                };
            }

            // 1. Check Pillar 1: Branch
            var hasBranch = await _context.Branches
                .AnyAsync(b => b.OrganizationId == orgId && !b.IsDeleted, cancellationToken);

            // 2. Check Pillar 2: Doctor
            var hasDoctor = await _context.Doctors
                .AnyAsync(d => d.OrganizationId == orgId && !d.IsDeleted, cancellationToken);

            // 3. Check Pillar 3: OPD Session
            var hasSession = await _context.Sessions
                .AnyAsync(s => s.Branch.OrganizationId == orgId && !s.IsDeleted && s.IsActive, cancellationToken);

            // 4. Check Pillar 4: Service Item / Rate List
            var hasRateList = await _context.ServiceItems
                .AnyAsync(si => si.OrganizationId == orgId && !si.IsDeleted && si.IsActive, cancellationToken);

            var isOnboarded = hasBranch && hasDoctor && hasSession && hasRateList;

            // Compute Current Step
            int currentStep = 1;
            if (!hasBranch) currentStep = 1;
            else if (!hasDoctor) currentStep = 2;
            else if (!hasSession) currentStep = 3;
            else if (!hasRateList) currentStep = 4;
            else currentStep = 4;

            // Fetch Current Staff (OrgAdmin) details to pre-fill
            string adminName = string.Empty;
            string adminEmail = string.Empty;
            string adminPhone = string.Empty;
            string adminPhoneDialCode = "+91";
            bool isDoctor = false;
            Guid? doctorId = null;

            if (Guid.TryParse(_currentUserService.UserId, out var parsedUserId))
            {
                var staff = await _context.Staffs
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.Id == parsedUserId, cancellationToken);

                if (staff != null)
                {
                    var fName = staff.FirstName?.Trim() ?? string.Empty;
                    var lName = staff.LastName?.Trim() ?? string.Empty;
                    if (string.Equals(lName, "User", StringComparison.OrdinalIgnoreCase))
                    {
                        adminName = fName;
                    }
                    else
                    {
                        adminName = $"{fName} {lName}".Trim();
                    }
                    adminEmail = staff.Email;
                    adminPhone = staff.PhoneNumber;
                    adminPhoneDialCode = string.IsNullOrWhiteSpace(staff.PhoneNumberDialCode) ? "+91" : staff.PhoneNumberDialCode;
                    doctorId = staff.DoctorId;
                    isDoctor = staff.DoctorId.HasValue;
                }
            }

            // Fetch existing table data for this organization if already present in DB
            var existingBranch = await _context.Branches
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.OrganizationId == orgId && !b.IsDeleted, cancellationToken);

            var existingDoctor = doctorId.HasValue
                ? await _context.Doctors.AsNoTracking().FirstOrDefaultAsync(d => d.Id == doctorId.Value && !d.IsDeleted, cancellationToken)
                : await _context.Doctors.AsNoTracking().FirstOrDefaultAsync(d => d.OrganizationId == orgId && !d.IsDeleted, cancellationToken);

            var existingSession = await _context.Sessions
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Branch.OrganizationId == orgId && !s.IsDeleted && s.IsActive, cancellationToken);

            var existingServiceItem = await _context.ServiceItems
                .AsNoTracking()
                .FirstOrDefaultAsync(si => si.OrganizationId == orgId && !si.IsDeleted && si.IsActive, cancellationToken);

            return new OnboardingStatusDto
            {
                IsOnboarded = isOnboarded,
                HasBranch = hasBranch,
                HasDoctor = hasDoctor,
                HasSession = hasSession,
                HasRateList = hasRateList,
                CurrentStep = currentStep,
                OrgAdminName = adminName,
                OrgAdminEmail = adminEmail,
                OrgAdminPhoneDialCode = adminPhoneDialCode,
                OrgAdminPhone = adminPhone,
                IsOrgAdminDoctor = isDoctor,
                DoctorId = doctorId,

                // Existing Branch Data from DB
                ExistingBranchName = existingBranch?.Name,
                ExistingBranchAddress = existingBranch?.Address,
                ExistingBranchPhone = existingBranch?.WhatsAppNumber,
                ExistingBranchPhoneDialCode = existingBranch?.WhatsAppDialCode,
                ExistingBranchLogoBase64 = existingBranch?.LogoBase64,
                ExistingTelegramBotToken = existingBranch?.TelegramBotToken,

                // Existing Doctor Data from DB
                ExistingDoctorSpecialization = existingDoctor?.Specialization,
                ExistingDoctorQualification = existingDoctor?.Qualification,
                ExistingDoctorExperience = existingDoctor?.Experience,
                ExistingDoctorGender = existingDoctor?.Gender,
                ExistingDoctorRegNo = existingDoctor?.RegistrationNumber,

                // Existing Session Data from DB
                ExistingSessionName = existingSession?.SessionName,
                ExistingSessionStartTime = existingSession != null ? existingSession.StartTime.ToString(@"hh\:mm") : null,
                ExistingSessionEndTime = existingSession != null ? existingSession.EndTime.ToString(@"hh\:mm") : null,
                ExistingSessionCapacity = existingSession?.DefaultCapacity,
                ExistingSessionIsDaily = existingSession?.IsDaily,

                // Existing Rate List Data from DB
                ExistingServiceName = existingServiceItem?.Name,
                ExistingServiceFee = existingServiceItem?.DefaultPrice
            };
        }
    }
}
