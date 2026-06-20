using CodeX.Application.Common.Interfaces;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using System.Linq;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace CodeX.Api.Controllers
{
    [Authorize]
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/[controller]")]
    public class PatientsController : ControllerBase
    {
        private readonly IApplicationDbContext _context;

        public PatientsController(IApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetPatients(
            [FromQuery] Guid? branchId,
            [FromQuery] string? search = null,
            [FromQuery] int page = 1,
            [FromQuery] int limit = 20)
        {
            IQueryable<Patient> query = _context.Patients;

            if (branchId.HasValue && branchId.Value != Guid.Empty)
            {
                query = query.Where(p => !p.Tokens.Any() || p.Tokens.Any(t => t.Queue.BranchId == branchId.Value));
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchTerm = search.ToLower();
                query = query.Where(p => p.Name.ToLower().Contains(searchTerm) || p.Phone.Contains(searchTerm));
            }

            var totalCount = await query.CountAsync();
            var totalPages = (int)Math.Ceiling((double)totalCount / limit);

            var patients = await query
                .OrderByDescending(p => p.CreatedAt)
                .Skip((page - 1) * limit)
                .Take(limit)
                .Select(p => new
                {
                    p.Id,
                    p.PatientCode,
                    p.Name,
                    p.Phone,
                    p.CreatedAt,
                    p.Age,
                    p.Gender,
                    p.MaritalStatus,
                    p.BloodGroup,
                    p.PreExistingConditions,
                    LastVisit = p.Visits
                        .OrderByDescending(v => v.VisitDate)
                        .Select(v => (DateTime?)v.VisitDate)
                        .FirstOrDefault(),
                    Email = p.Email,
                    Address = p.Address,
                    EmergencyContactName = p.EmergencyContactName,
                    EmergencyContactPhone = p.EmergencyContactPhone,
                    NextVisit = p.Tokens
                        .Where(t => t.Queue.QueueDate >= DateTime.UtcNow.Date && t.Status != CodeX.Domain.Enums.TokenStatus.Completed && t.Status != CodeX.Domain.Enums.TokenStatus.Cancelled)
                        .OrderBy(t => t.Queue.QueueDate)
                        .Select(t => (DateTime?)t.Queue.QueueDate)
                        .FirstOrDefault(),
                    Height = p.Height,
                    TotalVisits = p.Visits.Count,
                    TotalAttachments = p.Attachments.Count,
                    LastDiagnosis = p.Visits
                        .OrderByDescending(v => v.VisitDate)
                        .Select(v => v.Diagnosis)
                        .FirstOrDefault(),
                    LastSymptoms = p.Visits
                        .OrderByDescending(v => v.VisitDate)
                        .Select(v => v.Symptoms)
                        .FirstOrDefault()
                })
                .ToListAsync();

            return Ok(new
            {
                data = patients,
                totalCount = totalCount,
                totalPages = totalPages,
                currentPage = page
            });
        }



        [HttpPost]
        public async Task<IActionResult> AddPatient([FromBody] AddPatientDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Phone))
            {
                return BadRequest("Name and Phone are required.");
            }

            var existingPatient = await _context.Patients.FirstOrDefaultAsync(p => p.Phone == dto.Phone);
            if (existingPatient != null)
            {
                return BadRequest("A patient with this phone number already exists.");
            }

            var patient = new Patient
            {
                Name = dto.Name,
                Phone = dto.Phone,
                Age = dto.Age,
                Gender = dto.Gender,
                MaritalStatus = dto.MaritalStatus,
                BloodGroup = dto.BloodGroup,
                PreExistingConditions = dto.PreExistingConditions,
                Height = dto.Height,
                Email = dto.Email,
                Address = dto.Address,
                EmergencyContactName = dto.EmergencyContactName,
                EmergencyContactPhone = dto.EmergencyContactPhone,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Patients.Add(patient);
            await _context.SaveChangesAsync(new System.Threading.CancellationToken());

            return Ok(new {
                patient.Id,
                patient.PatientCode,
                patient.Name,
                patient.Phone,
                patient.Age,
                patient.Gender,
                patient.MaritalStatus,
                patient.BloodGroup,
                patient.PreExistingConditions,
                patient.Height,
                patient.Email,
                patient.Address,
                patient.EmergencyContactName,
                patient.EmergencyContactPhone,
                patient.CreatedAt
            });
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

    public class AddPatientDto
    {
        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Name is required")]
        [System.ComponentModel.DataAnnotations.MaxLength(255)]
        public string Name { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Phone number is required")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^\+?[1-9]\d{1,14}$", ErrorMessage = "Invalid phone number format.")]
        public string Phone { get; set; } = string.Empty;
        
        public string? Age { get; set; }
        public string? Gender { get; set; }
        public string? MaritalStatus { get; set; }
        public string? BloodGroup { get; set; }
        public string? PreExistingConditions { get; set; }
        public decimal? Height { get; set; }

        [System.ComponentModel.DataAnnotations.EmailAddress(ErrorMessage = "Invalid email address")]
        public string? Email { get; set; }
        public string? Address { get; set; }
        public string? EmergencyContactName { get; set; }
        public string? EmergencyContactPhone { get; set; }
    }
}
