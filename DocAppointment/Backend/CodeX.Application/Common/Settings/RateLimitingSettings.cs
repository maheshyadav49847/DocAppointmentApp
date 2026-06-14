namespace CodeX.Application.Common.Settings
{
    public class RateLimitingSettings
    {
        public int PermitLimit { get; set; } = 100;
        public int WindowSeconds { get; set; } = 60;
        public int QueueLimit { get; set; } = 2;
    }
}
