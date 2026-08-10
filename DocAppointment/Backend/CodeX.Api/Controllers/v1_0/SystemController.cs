using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.IO.Compression;

namespace CodeX.Api.Controllers.v1_0;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/system")]
// [Authorize(Roles = "SuperAdmin")] // Adjust this if you want it more or less restrictive
public class SystemController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<SystemController> _logger;

    public SystemController(IWebHostEnvironment env, ILogger<SystemController> logger)
    {
        _env = env;
        _logger = logger;
    }

    [HttpGet("logs/download")]
    public IActionResult DownloadLogs()
    {
        var logsDir = Path.Combine(_env.ContentRootPath, "logs");
        
        if (!Directory.Exists(logsDir))
        {
            return NotFound(new { Message = "Log directory not found." });
        }

        var logFiles = Directory.GetFiles(logsDir, "*.txt");
        if (logFiles.Length == 0)
        {
            return NotFound(new { Message = "No log files found." });
        }

        // Create a temporary zip file
        var tempZipPath = Path.Combine(Path.GetTempPath(), $"codex_logs_{DateTime.UtcNow:yyyyMMdd_HHmmss}.zip");
        var tempStagingDir = Path.Combine(Path.GetTempPath(), $"logs_staging_{Guid.NewGuid()}");

        try
        {
            Directory.CreateDirectory(tempStagingDir);
            foreach (var file in logFiles)
            {
                var destFile = Path.Combine(tempStagingDir, Path.GetFileName(file));
                using (var sourceStream = new FileStream(file, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                using (var destStream = new FileStream(destFile, FileMode.Create, FileAccess.Write))
                {
                    sourceStream.CopyTo(destStream);
                }
            }

            ZipFile.CreateFromDirectory(tempStagingDir, tempZipPath, CompressionLevel.Optimal, false);

            var memory = new MemoryStream();
            using (var stream = new FileStream(tempZipPath, FileMode.Open))
            {
                stream.CopyTo(memory);
            }
            memory.Position = 0;

            // Clean up the temp files
            System.IO.File.Delete(tempZipPath);
            Directory.Delete(tempStagingDir, true);

            return File(memory, "application/zip", $"codex_logs_{DateTime.UtcNow:yyyyMMdd}.zip");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create logs zip file");
            return StatusCode(500, new { Message = "Failed to download logs." });
        }
    }
}
