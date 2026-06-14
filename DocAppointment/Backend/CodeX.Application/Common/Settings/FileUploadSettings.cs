namespace CodeX.Application.Common.Settings
{
    public class FileUploadSettings
    {
        public int MaxSizeInBytes { get; set; } = 5242880; // Default 5 MB
        public string[] AllowedExtensions { get; set; } = new[] { ".jpg", ".jpeg", ".png", ".pdf" };
        public string UploadDirectory { get; set; } = "uploads";
    }
}
