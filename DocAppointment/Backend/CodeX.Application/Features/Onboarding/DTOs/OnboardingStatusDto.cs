using System;

namespace CodeX.Application.Features.Onboarding.DTOs
{
    public class OnboardingStatusDto
    {
        public bool IsOnboarded { get; set; }
        public bool HasBranch { get; set; }
        public bool HasDoctor { get; set; }
        public bool HasSession { get; set; }
        public bool HasRateList { get; set; }
        public int CurrentStep { get; set; } = 1;

        // Pre-fill info for logged-in OrgAdmin (from Staff table)
        public string OrgAdminName { get; set; } = string.Empty;
        public string OrgAdminEmail { get; set; } = string.Empty;
        public string OrgAdminPhoneDialCode { get; set; } = "+91";
        public string OrgAdminPhone { get; set; } = string.Empty;
        public bool IsOrgAdminDoctor { get; set; }
        public Guid? DoctorId { get; set; }

        // Existing Branch Data (from Branches table)
        public string? ExistingBranchName { get; set; }
        public string? ExistingBranchAddress { get; set; }
        public string? ExistingBranchPhone { get; set; }
        public string? ExistingBranchPhoneDialCode { get; set; }
        public string? ExistingBranchLogoBase64 { get; set; }
        public string? ExistingTelegramBotToken { get; set; }

        // Existing Doctor Data (from Doctors table)
        public string? ExistingDoctorSpecialization { get; set; }
        public string? ExistingDoctorQualification { get; set; }
        public string? ExistingDoctorExperience { get; set; }
        public string? ExistingDoctorGender { get; set; }
        public string? ExistingDoctorRegNo { get; set; }

        // Existing Session Data (from Sessions table)
        public string? ExistingSessionName { get; set; }
        public string? ExistingSessionStartTime { get; set; }
        public string? ExistingSessionEndTime { get; set; }
        public int? ExistingSessionCapacity { get; set; }
        public bool? ExistingSessionIsDaily { get; set; }

        // Existing Rate List Data (from ServiceItems table)
        public string? ExistingServiceName { get; set; }
        public decimal? ExistingServiceFee { get; set; }
    }
}
