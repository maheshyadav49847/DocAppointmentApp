using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using System.Linq;

namespace CodeX.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PatientsController : ControllerBase
    {
        private readonly IApplicationDbContext _context;

        public PatientsController(IApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetPatients()
        {
            // Simple query to get all patients (in production, we'd add pagination and filtering)
            var patients = await _context.Patients
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new
                {
                    p.Id,
                    p.PatientCode,
                    p.Name,
                    p.Phone,
                    p.CreatedAt,
                    LastVisit = p.Tokens
                        .Where(t => t.Queue.QueueDate < DateTime.UtcNow.Date || t.Status == CodeX.Domain.Enums.TokenStatus.Completed)
                        .OrderByDescending(t => t.Queue.QueueDate)
                        .Select(t => (DateTime?)t.Queue.QueueDate)
                        .FirstOrDefault(),
                    NextVisit = p.Tokens
                        .Where(t => t.Queue.QueueDate >= DateTime.UtcNow.Date && t.Status != CodeX.Domain.Enums.TokenStatus.Completed && t.Status != CodeX.Domain.Enums.TokenStatus.Cancelled)
                        .OrderBy(t => t.Queue.QueueDate)
                        .Select(t => (DateTime?)t.Queue.QueueDate)
                        .FirstOrDefault()
                })
                .ToListAsync();

            return Ok(patients);
        }

        [HttpGet("{id}/history")]
        public async Task<IActionResult> GetPatientHistory(Guid id)
        {
            var history = await _context.Tokens
                .Include(t => t.Queue)
                    .ThenInclude(q => q.Doctor)
                .Where(t => t.PatientId == id)
                .OrderByDescending(t => t.BookedAt)
                .Select(t => new
                {
                    t.Id,
                    t.TokenNumber,
                    t.Status,
                    t.BookedAt,
                    t.CompletedAt,
                    t.FeePaid,
                    QueueDate = t.Queue.QueueDate,
                    DoctorName = t.Queue.Doctor.Name,
                    Department = t.Queue.Doctor.Specialization
                })
                .ToListAsync();

            return Ok(history);
        }
    }
}
