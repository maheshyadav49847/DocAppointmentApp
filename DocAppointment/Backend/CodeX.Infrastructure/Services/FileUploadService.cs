using CodeX.Application.Common.Interfaces;
using CodeX.Application.Common.Settings;
using Microsoft.Extensions.Options;

namespace CodeX.Infrastructure.Services
{
    public class FileUploadService : IFileUploadService
    {
        private readonly FileUploadSettings _settings;

        public FileUploadService(IOptions<FileUploadSettings> options)
        {
            _settings = options.Value;
        }

        public async Task<string> UploadFileAsync(Stream fileStream, string fileName, string subDirectory)
        {
            if (fileStream == null || fileStream.Length == 0)
                throw new ArgumentException("File stream is empty");

            if (fileStream.Length > _settings.MaxSizeInBytes)
                throw new ArgumentException($"File size exceeds the limit of {_settings.MaxSizeInBytes / 1024 / 1024} MB");

            var ext = Path.GetExtension(fileName).ToLowerInvariant();
            if (string.IsNullOrEmpty(ext) || !_settings.AllowedExtensions.Contains(ext))
                throw new ArgumentException($"File extension {ext} is not allowed.");

            var baseDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var uploadPath = Path.Combine(baseDir, _settings.UploadDirectory, subDirectory);
            if (!Directory.Exists(uploadPath))
            {
                Directory.CreateDirectory(uploadPath);
            }

            var newFileName = $"{Guid.NewGuid()}{ext}";
            var filePath = Path.Combine(uploadPath, newFileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await fileStream.CopyToAsync(stream);
            }

            return Path.Combine(_settings.UploadDirectory, subDirectory, newFileName).Replace("\\", "/");
        }

        public void DeleteFile(string filePath)
        {
            if (string.IsNullOrWhiteSpace(filePath)) return;

            var baseDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var fullPath = Path.Combine(baseDir, filePath.Replace("/", "\\"));
            if (File.Exists(fullPath))
            {
                File.Delete(fullPath);
            }
        }
    }
}
