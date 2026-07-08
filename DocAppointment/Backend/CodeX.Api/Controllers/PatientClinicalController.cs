using CodeX.Api.Authorization;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Constants;
using CodeX.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Api.Controllers
{
    [Authorize]
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/[controller]")]
    public class PatientClinicalController : BaseApiController
    {
        private readonly IApplicationDbContext _context;

        public PatientClinicalController(IApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("branches")]
        [HasPermission($"{SystemPermissions.Patients.ViewHistory},{SystemPermissions.DoctorDesk.View}")]
        public async Task<ActionResult<List<CodeX.Domain.Entities.Branch>>> GetBranches()
        {
            var result = await Mediator.Send(new CodeX.Application.Features.Branches.Queries.GetBranches.GetBranchesQuery());
            return Ok(result);
        }

        // 1. Update Profile (Vitals + Basic Info)
        [HttpPut("{id}")]
        [HasPermission($"{SystemPermissions.Patients.Edit},{SystemPermissions.DoctorDesk.EditPatient}")]
        public async Task<IActionResult> UpdatePatientProfile(Guid id, [FromBody] UpdateProfileDto dto)
        {
            var patient = await _context.Patients.FirstOrDefaultAsync(p => p.Id == id);
            if (patient == null) return NotFound("Patient not found.");

            if (!string.IsNullOrWhiteSpace(dto.Name)) patient.Name = dto.Name;
            if (dto.Phone != null) patient.Phone = dto.Phone;
            if (dto.Email != null) patient.Email = dto.Email;
            if (dto.Address != null) patient.Address = dto.Address;
            if (dto.EmergencyContactName != null) patient.EmergencyContactName = dto.EmergencyContactName;
            if (dto.EmergencyContactPhone != null) patient.EmergencyContactPhone = dto.EmergencyContactPhone;
            patient.Age = dto.Age;
            patient.Gender = dto.Gender;
            patient.MaritalStatus = dto.MaritalStatus;
            patient.BloodGroup = dto.BloodGroup;
            patient.PreExistingConditions = dto.PreExistingConditions;
            patient.Height = dto.Height;
            patient.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(default);
            return Ok(patient);
        }

        // 2. Get Profile
        [HttpGet("{id}")]
        [HasPermission($"{SystemPermissions.Patients.ViewHistory},{SystemPermissions.DoctorDesk.View}")]
        public async Task<IActionResult> GetPatientProfile(Guid id)
        {
            var patient = await _context.Patients
                .Select(p => new
                {
                    p.Id,
                    p.PatientCode,
                    p.Name,
                    p.Phone,
                    p.Email,
                    p.Address,
                    p.EmergencyContactName,
                    p.EmergencyContactPhone,
                    p.Age,
                    p.Gender,
                    p.MaritalStatus,
                    p.BloodGroup,
                    p.PreExistingConditions,
                    p.Height,
                    p.CreatedAt,
                    p.UpdatedAt
                })
                .FirstOrDefaultAsync(p => p.Id == id);

            if (patient == null) return NotFound("Patient not found.");
            return Ok(patient);
        }

        // 3. Get Visits History
        [HttpGet("{id}/visits")]
        [HasPermission($"{SystemPermissions.Patients.ViewHistory},{SystemPermissions.DoctorDesk.View}")]
        public async Task<IActionResult> GetPatientVisits(Guid id, [FromQuery] int page = 1, [FromQuery] int limit = 20)
        {
            var query = _context.PatientVisits
                .Include(v => v.Doctor)
                .Include(v => v.Token).ThenInclude(t => t.Queue)
                .Include(v => v.Medicines)
                .Include(v => v.Attachments)
                .Where(v => v.PatientId == id);

            var totalCount = await query.CountAsync();

            var visits = await query
                .OrderByDescending(v => v.VisitDate)
                .Skip((page - 1) * limit)
                .Take(limit)
                .Select(v => new
                {
                    v.Id,
                    v.PatientId,
                    v.DoctorId,
                    DoctorName = v.Doctor.Name,
                    Department = v.Doctor.Specialization,
                    v.TokenId,
                    BranchId = v.Token != null ? (Guid?)v.Token.Queue.BranchId : null,
                    v.VisitDate,
                    v.Symptoms,
                    v.Diagnosis,
                    v.Advice,
                    v.InternalNotes,
                    v.Patient.Height,
                    v.Weight,
                    v.HeartRate,
                    v.BloodPressure,
                    v.OxygenLevel,
                    v.Temperature,
                    v.RespiratoryRate,
                    v.BloodSugar,
                    v.FollowUpDate,
                    FollowUpInstructions = _context.FollowUps.Where(f => f.PatientVisitId == v.Id && !f.IsDeleted).Select(f => f.Instructions).FirstOrDefault(),
                    Medicines = v.Medicines.Select(m => new
                    {
                        m.Id,
                        m.MedicineName,
                        m.Dosage,
                        MedicineType = m.MedicineType != null ? m.MedicineType.Name : null,
                        m.DoseQty,
                        m.DoseSchedule,
                        m.FoodTiming,
                        m.CourseDuration,
                        m.ClinicalInstructions
                    }),
                    Attachments = v.Attachments.Where(a => !a.IsDeleted).Select(a => new { a.Id, a.FileName, a.FileUrl, a.Category, a.UploadDate })
                })
                .ToListAsync();

            var totalPages = (int)Math.Ceiling(totalCount / (double)limit);

            return Ok(new
            {
                data = visits,
                totalCount,
                totalPages,
                currentPage = page
            });
        }

        [HttpGet("{id}/has-token-today")]
        [HasPermission($"{SystemPermissions.Patients.ViewHistory},{SystemPermissions.DoctorDesk.View}")]
        public async Task<IActionResult> HasTokenToday(Guid id)
        {
            var todayStart = DateTime.UtcNow.Date;
            var todayEnd = todayStart.AddDays(1);

            var token = await _context.Tokens
                .Where(t => t.PatientId == id && t.Queue.QueueDate >= todayStart && t.Queue.QueueDate < todayEnd)
                .OrderByDescending(t => t.CreatedAt)
                .FirstOrDefaultAsync();

            if (token == null)
            {
                return Ok(new { hasToken = false, status = "None" });
            }

            return Ok(new { hasToken = true, status = token.Status.ToString() });
        }

        // 4. Create a Visit
        [HttpPost("{id}/visits")]
        [HasPermission($"{SystemPermissions.Patients.Edit},{SystemPermissions.DoctorDesk.View}")]
        public async Task<IActionResult> AddPatientVisit(Guid id, [FromBody] AddVisitDto dto)
        {
            var patientExists = await _context.Patients.AnyAsync(p => p.Id == id);
            if (!patientExists) return NotFound("Patient not found.");

            // Anti-Spam Check: Prevent creating another visit if one was created within the last 10 seconds
            var tenSecondsAgo = DateTime.UtcNow.AddSeconds(-10);
            var isSpam = await _context.PatientVisits.AnyAsync(v => v.PatientId == id && v.CreatedAt >= tenSecondsAgo);
            if (isSpam)
            {
                return BadRequest("A consultation was just saved. Please wait a moment or edit the existing record.");
            }

            var visit = new PatientVisit
            {
                PatientId = id,
                DoctorId = dto.DoctorId,
                VisitDate = dto.VisitDate ?? DateTime.UtcNow,
                Symptoms = dto.Symptoms,
                Diagnosis = dto.Diagnosis,
                Advice = dto.Advice,
                InternalNotes = dto.InternalNotes,
                Weight = dto.Weight,
                HeartRate = dto.HeartRate,
                BloodPressure = dto.BloodPressure,
                OxygenLevel = dto.OxygenLevel,
                Temperature = dto.Temperature,
                RespiratoryRate = dto.RespiratoryRate,
                BloodSugar = dto.BloodSugar,
                FollowUpDate = dto.FollowUpDate
            };

            // Handle token assignment and validation
            if (dto.TokenId.HasValue)
            {
                var token = await _context.Tokens.Include(t => t.Queue).FirstOrDefaultAsync(t => t.Id == dto.TokenId.Value);
                if (token == null)
                {
                    return BadRequest("The provided booking token does not exist.");
                }

                if (token.Status != CodeX.Domain.Enums.TokenStatus.Called)
                {
                    return BadRequest($"Cannot save consultation. The token status is '{token.Status}'. They must be 'Called' (in the consulting room) to save a record.");
                }

                var existingVisitForThisPatient = await _context.PatientVisits.FirstOrDefaultAsync(v => v.TokenId == dto.TokenId.Value && v.PatientId == id);
                if (existingVisitForThisPatient != null)
                {
                    return BadRequest("A consultation record already exists for this patient under this booking token. Please edit the existing record from the history timeline instead of creating a new one.");
                }

                // If the doctor selected a different patient profile for this token, update the token's patient ID!
                if (token.PatientId != id)
                {
                    var oldPatientId = token.PatientId;
                    token.PatientId = id;

                    // Cleanup: If the old patient profile was a dummy (has no other tokens, no visits, no attachments), delete it to avoid confusion.
                    var hasOtherTokens = await _context.Tokens.AnyAsync(t => t.PatientId == oldPatientId && t.Id != token.Id);
                    var hasVisits = await _context.PatientVisits.AnyAsync(v => v.PatientId == oldPatientId);
                    var hasAttachments = await _context.PatientAttachments.AnyAsync(a => a.PatientId == oldPatientId);

                    if (!hasOtherTokens && !hasVisits && !hasAttachments)
                    {
                        var dummyPatient = await _context.Patients.FindAsync(oldPatientId);
                        if (dummyPatient != null)
                        {
                            _context.Patients.Remove(dummyPatient);
                        }
                    }
                }

                visit.TokenId = token.Id;
            }
            else
            {
                // Auto-assign to an active token if none provided
                var today = DateTime.UtcNow.Date;
                var todaysTokens = await _context.Tokens
                    .Include(t => t.Queue)
                    .Where(t => t.PatientId == id && t.Queue.QueueDate >= today && t.Queue.QueueDate < today.AddDays(1))
                    .OrderByDescending(t => t.CreatedAt)
                    .ToListAsync();

                if (!todaysTokens.Any())
                {
                    return BadRequest("Consultation cannot be saved without a booking. Please edit an existing record or create a new booking for the patient.");
                }

                var activeToken = todaysTokens.First();
                if (activeToken.Status != CodeX.Domain.Enums.TokenStatus.Called)
                {
                    return BadRequest($"Cannot save consultation. The patient's token status is '{activeToken.Status}'. They must be 'Called' (in the consulting room) to save a new record.");
                }

                var availableToken = todaysTokens.FirstOrDefault(t => !_context.PatientVisits.Any(v => v.TokenId == t.Id));
                if (availableToken != null)
                {
                    visit.TokenId = availableToken.Id;
                }
                else
                {
                    return BadRequest("All queue tokens for this patient today already have consultation records. Please edit the existing records instead of creating a new one.");
                }
            }


            if (dto.Medicines != null && dto.Medicines.Any())
            {
                // Pre-fetch all medicine types
                var existingTypes = await _context.MedicineTypes.AsNoTracking().ToDictionaryAsync(t => t.Name.ToLower(), t => t.Id);

                foreach (var med in dto.Medicines)
                {
                    Guid? typeId = null;
                    if (!string.IsNullOrWhiteSpace(med.MedicineType))
                    {
                        var typeName = med.MedicineType.Trim();
                        var lowerTypeName = typeName.ToLower();
                        if (existingTypes.TryGetValue(lowerTypeName, out var existingId))
                        {
                            typeId = existingId;
                        }
                        else
                        {
                            var newType = new MedicineType { Name = typeName };
                            await _context.MedicineTypes.AddAsync(newType);
                            await _context.SaveChangesAsync(default);
                            typeId = newType.Id;
                            existingTypes[lowerTypeName] = typeId.Value;
                        }
                    }

                    visit.Medicines.Add(new VisitMedicine
                    {
                        MedicineName = med.MedicineName,
                        Dosage = med.Dosage,
                        MedicineTypeId = typeId,
                        DoseQty = med.DoseQty,
                        DoseSchedule = med.DoseSchedule,
                        FoodTiming = med.FoodTiming,
                        CourseDuration = med.CourseDuration,
                        ClinicalInstructions = med.ClinicalInstructions
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

        [HttpPost("{id}/vitals")]
        [HasPermission($"{SystemPermissions.Patients.Edit},{SystemPermissions.DoctorDesk.View}")]
        public async Task<IActionResult> AddVitals(Guid id, [FromBody] EditVisitDto dto)
        {
            var patientExists = await _context.Patients.AnyAsync(p => p.Id == id);
            if (!patientExists) return NotFound("Patient not found.");

            // Find today's active visit to append vitals to, or return error
            var today = DateTime.UtcNow.Date;
            var todaysVisit = await _context.PatientVisits
                .Where(v => v.PatientId == id && v.VisitDate >= today && v.VisitDate < today.AddDays(1))
                .OrderByDescending(v => v.CreatedAt)
                .FirstOrDefaultAsync();

            if (todaysVisit == null)
            {
                // Let's check if they have a token today, if so we create a blank visit just for vitals
                var todaysToken = await _context.Tokens
                    .Include(t => t.Queue)
                    .Where(t => t.PatientId == id && t.Queue.QueueDate >= today && t.Queue.QueueDate < today.AddDays(1))
                    .OrderByDescending(t => t.Queue.QueueDate)
                    .FirstOrDefaultAsync();

                if (todaysToken == null)
                {
                    return BadRequest("Vitals can only be recorded if the patient has a booking/token today or an active consultation.");
                }

                // Create a placeholder visit to hold vitals
                todaysVisit = new PatientVisit
                {
                    PatientId = id,
                    TokenId = todaysToken.Id,
                    DoctorId = todaysToken.Queue.DoctorId,
                    VisitDate = DateTime.UtcNow,
                };
                _context.PatientVisits.Add(todaysVisit);
            }

            // Update vitals on the visit
            if (dto.Weight.HasValue) todaysVisit.Weight = dto.Weight;
            if (dto.HeartRate.HasValue) todaysVisit.HeartRate = dto.HeartRate;
            if (!string.IsNullOrWhiteSpace(dto.BloodPressure)) todaysVisit.BloodPressure = dto.BloodPressure;
            if (dto.OxygenLevel.HasValue) todaysVisit.OxygenLevel = dto.OxygenLevel;
            if (dto.Temperature.HasValue) todaysVisit.Temperature = dto.Temperature;
            if (dto.RespiratoryRate.HasValue) todaysVisit.RespiratoryRate = dto.RespiratoryRate;
            if (dto.BloodSugar.HasValue) todaysVisit.BloodSugar = dto.BloodSugar;

            // Also update height on the patient profile directly since it's an invariant metric
            if (dto.Height.HasValue)
            {
                var patient = await _context.Patients.FindAsync(id);
                if (patient != null) patient.Height = dto.Height;
            }

            await _context.SaveChangesAsync(default);
            return Ok(new { success = true, visitId = todaysVisit.Id });
        }

        // 5. Update Visit (Save as Draft or final)
        [HttpPut("visits/{visitId}")]
        [HasPermission($"{SystemPermissions.Patients.Edit},{SystemPermissions.DoctorDesk.View}")]
        public async Task<IActionResult> UpdatePatientVisit(Guid visitId, [FromBody] EditVisitDto dto)
        {
            var visit = await _context.PatientVisits
                .FirstOrDefaultAsync(v => v.Id == visitId);

            if (visit == null) return NotFound("Visit not found.");

            visit.Symptoms = dto.Symptoms;
            visit.Diagnosis = dto.Diagnosis;
            visit.Advice = dto.Advice;
            visit.InternalNotes = dto.InternalNotes;
            visit.Weight = dto.Weight;
            visit.HeartRate = dto.HeartRate;
            visit.BloodPressure = dto.BloodPressure;
            visit.OxygenLevel = dto.OxygenLevel;
            visit.Temperature = dto.Temperature;
            visit.RespiratoryRate = dto.RespiratoryRate;
            visit.BloodSugar = dto.BloodSugar;
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
                var existingTypes = await _context.MedicineTypes.AsNoTracking().ToDictionaryAsync(t => t.Name.ToLower(), t => t.Id);

                foreach (var med in dto.Medicines)
                {
                    Guid? typeId = null;
                    if (!string.IsNullOrWhiteSpace(med.MedicineType))
                    {
                        var typeName = med.MedicineType.Trim();
                        var lowerTypeName = typeName.ToLower();
                        if (existingTypes.TryGetValue(lowerTypeName, out var existingId))
                        {
                            typeId = existingId;
                        }
                        else
                        {
                            var newType = new MedicineType { Name = typeName };
                            await _context.MedicineTypes.AddAsync(newType);
                            await _context.SaveChangesAsync(default);
                            typeId = newType.Id;
                            existingTypes[lowerTypeName] = typeId.Value;
                        }
                    }

                    _context.VisitMedicines.Add(new VisitMedicine
                    {
                        PatientVisitId = visitId,
                        MedicineName = med.MedicineName,
                        Dosage = med.Dosage,
                        MedicineTypeId = typeId,
                        DoseQty = med.DoseQty,
                        DoseSchedule = med.DoseSchedule,
                        FoodTiming = med.FoodTiming,
                        CourseDuration = med.CourseDuration,
                        ClinicalInstructions = med.ClinicalInstructions
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

        // 6. Upload Attachment
        [HttpPost("{id}/attachments")]
        [HasPermission($"{SystemPermissions.Patients.Edit},{SystemPermissions.DoctorDesk.View}")]
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
        [HasPermission($"{SystemPermissions.Patients.Edit},{SystemPermissions.DoctorDesk.View}")]
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
        [HasPermission($"{SystemPermissions.Patients.ViewHistory},{SystemPermissions.DoctorDesk.View}")]
        public async Task<IActionResult> GetAttachments(Guid id, [FromQuery] int page = 1, [FromQuery] int limit = 20)
        {
            var query = _context.PatientAttachments
                .Where(a => a.PatientId == id);

            var totalCount = await query.CountAsync();

            var attachments = await query
                .OrderByDescending(a => a.UploadDate)
                .Skip((page - 1) * limit)
                .Take(limit)
                .Select(a => new { a.Id, a.FileName, a.Category, a.FileUrl, a.UploadDate })
                .ToListAsync();

            var totalPages = (int)Math.Ceiling(totalCount / (double)limit);

            return Ok(new
            {
                data = attachments,
                totalCount,
                totalPages,
                currentPage = page
            });
        }

        // 8. Get patient followups
        [HttpGet("{id}/followups")]
        [HasPermission($"{SystemPermissions.Patients.ViewHistory},{SystemPermissions.DoctorDesk.View}")]
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
        [HasPermission($"{SystemPermissions.Patients.Edit},{SystemPermissions.DoctorDesk.View}")]
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
        [HasPermission($"{SystemPermissions.Patients.Edit},{SystemPermissions.DoctorDesk.View}")]
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
        [HasPermission($"{SystemPermissions.Patients.View},{SystemPermissions.DoctorDesk.View}")]
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
        public string? Name { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
        public string? EmergencyContactName { get; set; }
        public string? EmergencyContactPhone { get; set; }
        public string? Age { get; set; }
        public string? Gender { get; set; }
        public string? MaritalStatus { get; set; }
        public string? BloodGroup { get; set; }
        public string? PreExistingConditions { get; set; }
        public decimal? Height { get; set; }
    }

    public class AddVisitDto
    {
        public Guid DoctorId { get; set; }
        public Guid? TokenId { get; set; }
        public DateTime? VisitDate { get; set; }
        public string? Symptoms { get; set; }
        public string? Diagnosis { get; set; }
        public string? Advice { get; set; }
        public string? InternalNotes { get; set; }
        public decimal? Weight { get; set; }
        public int? HeartRate { get; set; }
        public string? BloodPressure { get; set; }
        public decimal? OxygenLevel { get; set; }
        public decimal? Temperature { get; set; }
        public int? RespiratoryRate { get; set; }
        public decimal? BloodSugar { get; set; }
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
        public decimal? Weight { get; set; }
        public decimal? Height { get; set; }
        public int? HeartRate { get; set; }
        public string? BloodPressure { get; set; }
        public decimal? OxygenLevel { get; set; }
        public decimal? Temperature { get; set; }
        public int? RespiratoryRate { get; set; }
        public decimal? BloodSugar { get; set; }
        public DateTime? FollowUpDate { get; set; }
        public string? FollowUpInstructions { get; set; }
        public List<MedicineDto>? Medicines { get; set; }
    }

    public class MedicineDto
    {
        public string MedicineName { get; set; } = string.Empty;
        public string Dosage { get; set; } = string.Empty;
        public string? MedicineType { get; set; }
        public string? DoseQty { get; set; }
        public string? DoseSchedule { get; set; }
        public string? FoodTiming { get; set; }
        public string? CourseDuration { get; set; }
        public string? ClinicalInstructions { get; set; }
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
