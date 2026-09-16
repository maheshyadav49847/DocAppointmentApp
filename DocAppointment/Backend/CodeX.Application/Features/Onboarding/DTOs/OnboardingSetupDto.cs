using System;

namespace CodeX.Application.Features.Onboarding.DTOs
{
    public class BranchSetupDto
    {
        public string Name { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Pincode { get; set; }
        public string PhoneDialCode { get; set; } = "+91";
        public string Phone { get; set; } = string.Empty;
        public string WhatsAppDialCode { get; set; } = "+91";
        public string? WhatsAppNumber { get; set; }
        public string? TelegramBotToken { get; set; }
        public string? LogoBase64 { get; set; }
    }

    public class DoctorSetupDto
    {
        public bool IsOrgAdminDoctor { get; set; } = false;
        public string Name { get; set; } = string.Empty;
        public string Specialization { get; set; } = "General Physician";
        public string? RegistrationNumber { get; set; }
        public decimal ConsultationFee { get; set; } = 300;
        public int ConsultationDurationMinutes { get; set; } = 15;
        public string? Gender { get; set; }
        public string? Qualification { get; set; }
        public string? Experience { get; set; }
        public string MobileDialCode { get; set; } = "+91";
        public string? Mobile { get; set; }
        public string? EmailId { get; set; }
    }

    public class SessionSetupDto
    {
        public string SessionName { get; set; } = "General OPD";
        public bool IsDaily { get; set; } = true;
        public int DayOfWeek { get; set; } = 1; // Monday default if not daily
        public System.Collections.Generic.List<int>? DaysOfWeek { get; set; }
        public TimeSpan StartTime { get; set; } = new TimeSpan(9, 0, 0); // 09:00 AM
        public TimeSpan EndTime { get; set; } = new TimeSpan(13, 0, 0);   // 01:00 PM
        public int DefaultCapacity { get; set; } = 30;
    }

    public class RateListSetupDto
    {
        public string ServiceName { get; set; } = "Doctor Consultation";
        public string Category { get; set; } = "Consultation";
        public decimal Price { get; set; } = 300;
    }

    public class CompleteOnboardingSetupResult
    {
        public bool Success { get; set; }
        public Guid BranchId { get; set; }
        public Guid DoctorId { get; set; }
        public Guid SessionId { get; set; }
        public Guid ServiceItemId { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}
