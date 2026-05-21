using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PatientClinicalController : ControllerBase
    {
        private readonly IApplicationDbContext _context;

        public PatientClinicalController(IApplicationDbContext context)
        {
            _context = context;
        }

        // 1. Update Patient Overview Profile
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePatientProfile(Guid id, [FromBody] UpdateProfileDto dto)
        {
            var patient = await _context.Patients.FirstOrDefaultAsync(p => p.Id == id);
            if (patient == null) return NotFound("Patient not found.");

            patient.Age = dto.Age;
            patient.Gender = dto.Gender;
            patient.BloodGroup = dto.BloodGroup;
            patient.ChronicTags = dto.ChronicTags;
            patient.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(default);
            return Ok(patient);
        }

        // 2. Fetch all visits for a patient (including medicines and doctor details)
        [HttpGet("{id}/visits")]
        public async Task<IActionResult> GetPatientVisits(Guid id)
        {
            var visits = await _context.PatientVisits
                .Include(v => v.Doctor)
                .Include(v => v.Medicines)
                .Include(v => v.Attachments)
                .Where(v => v.PatientId == id)
                .OrderByDescending(v => v.VisitDate)
                .Select(v => new
                {
                    v.Id,
                    v.PatientId,
                    v.DoctorId,
                    DoctorName = v.Doctor.Name,
                    Department = v.Doctor.Specialization,
                    v.TokenId,
                    v.VisitDate,
                    v.Symptoms,
                    v.Diagnosis,
                    v.Advice,
                    v.InternalNotes,
                    v.FollowUpDate,
                    FollowUpInstructions = _context.FollowUps.Where(f => f.PatientVisitId == v.Id && !f.IsDeleted).Select(f => f.Instructions).FirstOrDefault(),
                    Medicines = v.Medicines.Select(m => new { m.Id, m.MedicineName, m.Dosage }),
                    Attachments = v.Attachments.Where(a => !a.IsDeleted).Select(a => new { a.Id, a.FileName, a.FileUrl, a.Category, a.UploadDate })
                })
                .ToListAsync();

            return Ok(visits);
        }

        // 3. Add manual visit entry
        [HttpPost("{id}/visits")]
        public async Task<IActionResult> AddPatientVisit(Guid id, [FromBody] AddVisitDto dto)
        {
            var patientExists = await _context.Patients.AnyAsync(p => p.Id == id);
            if (!patientExists) return NotFound("Patient not found.");

            var visit = new PatientVisit
                {
                    PatientId = id,
                    DoctorId = dto.DoctorId,
                    VisitDate = dto.VisitDate ?? DateTime.UtcNow,
                    Symptoms = dto.Symptoms,
                    Diagnosis = dto.Diagnosis,
                    Advice = dto.Advice,
                    InternalNotes = dto.InternalNotes,
                    FollowUpDate = dto.FollowUpDate
                };

                if (dto.Medicines != null && dto.Medicines.Any())
                {
                    foreach (var med in dto.Medicines)
                    {
                        visit.Medicines.Add(new VisitMedicine
                        {
                            MedicineName = med.MedicineName,
                            Dosage = med.Dosage
                        });
                    }
                }

                _context.PatientVisits.Add(visit);

                // If FollowUpDate is set, automatically add to FollowUps table too
                if (dto.FollowUpDate.HasValue)
                {
                    _context.FollowUps.Add(new FollowUp
                    {
                        PatientId = id,
                        PatientVisitId = visit.Id,
                        FollowUpDate = dto.FollowUpDate.Value,
                        Instructions = dto.FollowUpInstructions,
                        ReminderEnabled = true,
                        WhatsAppSent = false
                    });
                }

            await _context.SaveChangesAsync(default);
            return Ok(new { id = visit.Id });
        }

        // 4. Update visit details & medicines
        [HttpPut("visits/{visitId}")]
        public async Task<IActionResult> UpdatePatientVisit(Guid visitId, [FromBody] EditVisitDto dto)
        {
            var visit = await _context.PatientVisits
                .FirstOrDefaultAsync(v => v.Id == visitId);

            if (visit == null) return NotFound("Visit not found.");

            visit.Symptoms = dto.Symptoms;
            visit.Diagnosis = dto.Diagnosis;
            visit.Advice = dto.Advice;
            visit.InternalNotes = dto.InternalNotes;
            visit.FollowUpDate = dto.FollowUpDate;
            visit.UpdatedAt = DateTime.UtcNow;

            // Update medicines: fetch ALL existing (bypassing soft-delete filter), hard delete, re-insert
            var existingMedicines = await _context.VisitMedicines
                .IgnoreQueryFilters()
                .Where(m => m.PatientVisitId == visitId)
                .ToListAsync();
            _context.VisitMedicines.RemoveRange(existingMedicines);

            if (dto.Medicines != null && dto.Medicines.Any())
            {
                foreach (var med in dto.Medicines)
                {
                    _context.VisitMedicines.Add(new VisitMedicine
                    {
                        PatientVisitId = visitId,
                        MedicineName = med.MedicineName,
                        Dosage = med.Dosage
                    });
                }
            }

            // Sync follow-up if applicable
            var existingFollowup = await _context.FollowUps.FirstOrDefaultAsync(f => f.PatientVisitId == visitId);
            if (dto.FollowUpDate.HasValue)
            {
                if (existingFollowup != null)
                {
                    existingFollowup.FollowUpDate = dto.FollowUpDate.Value;
                    existingFollowup.Instructions = dto.FollowUpInstructions;
                    existingFollowup.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    _context.FollowUps.Add(new FollowUp
                    {
                        PatientId = visit.PatientId,
                        PatientVisitId = visit.Id,
                        FollowUpDate = dto.FollowUpDate.Value,
                        Instructions = dto.FollowUpInstructions,
                        ReminderEnabled = true,
                        WhatsAppSent = false
                    });
                }
            }
            else if (existingFollowup != null)
            {
                // Remove if cleared
                _context.FollowUps.Remove(existingFollowup);
            }

            await _context.SaveChangesAsync(default);
            return Ok(new { id = visit.Id });
        }

        // 5. Upload file attachment (PDF/PNG/JPEG)
        [HttpPost("{id}/attachments")]
        public async Task<IActionResult> UploadAttachment(Guid id, [FromForm] IFormFile file, [FromForm] string category, [FromForm] Guid? patientVisitId)
        {
            var patient = await _context.Patients.FirstOrDefaultAsync(p => p.Id == id);
            if (patient == null) return NotFound("Patient not found.");

            if (file == null || file.Length == 0) return BadRequest("File is empty.");
            if (file.Length > 10 * 1024 * 1024) return BadRequest("File size exceeds the 10MB limit.");

            // Create uploads directory
            var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
            if (!Directory.Exists(uploadsDir))
            {
                Directory.CreateDirectory(uploadsDir);
            }

            // Secure filename
            var uniqueFileName = $"{Guid.NewGuid()}_{Path.GetFileName(file.FileName)}";
            var filePath = Path.Combine(uploadsDir, uniqueFileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Serve relative path URL
            var fileUrl = $"/uploads/{uniqueFileName}";

            var attachment = new PatientAttachment
            {
                PatientId = id,
                PatientVisitId = patientVisitId,
                FileName = file.FileName,
                Category = string.IsNullOrWhiteSpace(category) ? "Other" : category,
                FileUrl = fileUrl,
                UploadDate = DateTime.UtcNow
            };

            _context.PatientAttachments.Add(attachment);
            await _context.SaveChangesAsync(default);

            return Ok(new { attachment.Id, attachment.FileName, attachment.Category, attachment.FileUrl, attachment.UploadDate });
        }

        // 6. Delete attachment
        [HttpDelete("attachments/{attachmentId}")]
        public async Task<IActionResult> DeleteAttachment(Guid attachmentId)
        {
            var attachment = await _context.PatientAttachments.FirstOrDefaultAsync(a => a.Id == attachmentId);
            if (attachment == null) return NotFound("Attachment not found.");

            // Soft-delete database entry
            attachment.IsDeleted = true;
            attachment.UpdatedAt = DateTime.UtcNow;

            // Optionally delete physical file
            var relativePath = attachment.FileUrl.Replace("/", "\\").TrimStart('\\');
            var physicalPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", relativePath);
            if (System.IO.File.Exists(physicalPath))
            {
                try
                {
                    System.IO.File.Delete(physicalPath);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[FILE_DELETE_ERROR] {ex.Message}");
                }
            }

            await _context.SaveChangesAsync(default);
            return Ok(new { Success = true });
        }

        // 7. Get all attachments for a patient
        [HttpGet("{id}/attachments")]
        public async Task<IActionResult> GetAttachments(Guid id)
        {
            var attachments = await _context.PatientAttachments
                .Where(a => a.PatientId == id)
                .OrderByDescending(a => a.UploadDate)
                .Select(a => new { a.Id, a.FileName, a.Category, a.FileUrl, a.UploadDate })
                .ToListAsync();

            return Ok(attachments);
        }

        // 8. Get patient followups
        [HttpGet("{id}/followups")]
        public async Task<IActionResult> GetFollowUps(Guid id)
        {
            var followups = await _context.FollowUps
                .Where(f => f.PatientId == id)
                .OrderBy(f => f.FollowUpDate)
                .Select(f => new { f.Id, f.FollowUpDate, f.ReminderEnabled, f.WhatsAppSent })
                .ToListAsync();

            return Ok(followups);
        }

        // 9. Add follow-up
        [HttpPost("{id}/followups")]
        public async Task<IActionResult> AddFollowUp(Guid id, [FromBody] AddFollowUpDto dto)
        {
            var followup = new FollowUp
            {
                PatientId = id,
                FollowUpDate = dto.FollowUpDate,
                ReminderEnabled = dto.ReminderEnabled,
                WhatsAppSent = false
            };

            _context.FollowUps.Add(followup);
            await _context.SaveChangesAsync(default);

            return Ok(followup);
        }

        // 10. Toggle reminder state / Update date
        [HttpPut("followups/{followupId}")]
        public async Task<IActionResult> UpdateFollowUp(Guid followupId, [FromBody] UpdateFollowUpDto dto)
        {
            var followup = await _context.FollowUps.FirstOrDefaultAsync(f => f.Id == followupId);
            if (followup == null) return NotFound("Follow-up not found.");

            followup.ReminderEnabled = dto.ReminderEnabled;
            if (dto.FollowUpDate.HasValue)
            {
                followup.FollowUpDate = dto.FollowUpDate.Value;
            }
            followup.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(default);
            return Ok(followup);
        }

        // 11. Overdue followups list
        [HttpGet("followups/overdue")]
        public async Task<IActionResult> GetOverdueFollowUps([FromQuery] Guid? branchId)
        {
            // Fetch follow-ups that are scheduled in the past and WhatsApp reminders have not been sent yet
            var query = _context.FollowUps
                .Include(f => f.Patient)
                .Where(f => f.FollowUpDate < DateTime.UtcNow.Date && !f.WhatsAppSent && f.ReminderEnabled);

            if (branchId.HasValue && branchId.Value != Guid.Empty)
            {
                query = query.Where(f => f.Patient.Tokens.Any(t => t.Queue.BranchId == branchId.Value));
            }

            var result = await query
                .Select(f => new
                {
                    f.Id,
                    f.PatientId,
                    PatientName = f.Patient.Name,
                    PatientPhone = f.Patient.Phone,
                    f.FollowUpDate,
                    f.ReminderEnabled
                })
                .ToListAsync();

            return Ok(result);
        }
    }

    // DTOs
    public class UpdateProfileDto
    {
        public string? Age { get; set; }
        public string? Gender { get; set; }
        public string? BloodGroup { get; set; }
        public string? ChronicTags { get; set; }
    }

    public class AddVisitDto
    {
        public Guid DoctorId { get; set; }
        public DateTime? VisitDate { get; set; }
        public string? Symptoms { get; set; }
        public string? Diagnosis { get; set; }
        public string? Advice { get; set; }
        public string? InternalNotes { get; set; }
        public DateTime? FollowUpDate { get; set; }
        public string? FollowUpInstructions { get; set; }
        public List<MedicineDto>? Medicines { get; set; }
    }

    public class EditVisitDto
    {
        public string? Symptoms { get; set; }
        public string? Diagnosis { get; set; }
        public string? Advice { get; set; }
        public string? InternalNotes { get; set; }
        public DateTime? FollowUpDate { get; set; }
        public string? FollowUpInstructions { get; set; }
        public List<MedicineDto>? Medicines { get; set; }
    }

    public class MedicineDto
    {
        public string MedicineName { get; set; } = string.Empty;
        public string Dosage { get; set; } = string.Empty;
    }

    public class AddFollowUpDto
    {
        public DateTime FollowUpDate { get; set; }
        public bool ReminderEnabled { get; set; } = true;
        public string? Instructions { get; set; }
    }

    public class UpdateFollowUpDto
    {
        public bool ReminderEnabled { get; set; }
        public DateTime? FollowUpDate { get; set; }
    }
}
