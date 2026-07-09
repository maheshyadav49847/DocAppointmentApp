namespace CodeX.Application.Common.Interfaces
{
    public interface IFileUploadService
    {
        Task<string> UploadFileAsync(Stream fileStream, string fileName, string subDirectory);
        void DeleteFile(string filePath);
    }
}
