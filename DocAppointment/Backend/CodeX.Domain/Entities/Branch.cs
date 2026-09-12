using CodeX.Domain.Common;

namespace CodeX.Domain.Entities
{
    public class Branch : BaseEntity, IMustHaveTenant
    {
        public Guid OrganizationId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string WhatsAppDialCode { get; set; } = "+91";
        public string WhatsAppNumber { get; set; } = string.Empty;
        public string? WhatsAppApiKey { get; set; }

        // WhatsApp Integration settings
        public string WhatsAppProvider { get; set; } = "MetaCloud"; // "MetaCloud", "Twilio"
        public string? MetaWabaId { get; set; }
        public string? MetaPhoneNumberId { get; set; }
        public string? MetaSystemUserToken { get; set; }

        public string Timezone { get; set; } = "India Standard Time";
        public string? LogoBase64 { get; set; }

        public string? TelegramBotToken { get; set; }

        [System.ComponentModel.DataAnnotations.Schema.NotMapped]
        public bool IsTelegramConfigured => !string.IsNullOrWhiteSpace(TelegramBotToken);

        [System.ComponentModel.DataAnnotations.Schema.NotMapped]
        public bool IsWhatsAppConfigured => !string.IsNullOrWhiteSpace(WhatsAppNumber) &&
            (string.Equals(WhatsAppProvider, "Twilio", System.StringComparison.OrdinalIgnoreCase) || !string.IsNullOrWhiteSpace(MetaPhoneNumberId));

        // Navigation Properties
        public virtual Organization? Organization { get; set; }
        public virtual ICollection<Doctor>? Doctors { get; set; } = new List<Doctor>();
        public virtual ICollection<DailyQueue>? DailyQueues { get; set; } = new List<DailyQueue>();
    }
}

