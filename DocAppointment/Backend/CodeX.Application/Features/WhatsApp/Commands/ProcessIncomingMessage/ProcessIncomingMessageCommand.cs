using CodeX.Application.Common.Helpers;
using CodeX.Application.Common.Interfaces;
using CodeX.Application.Features.Ratings.Commands.CreateRating;
using CodeX.Application.Features.Tokens.Commands.CreateToken;
using CodeX.Domain.Entities;
using CodeX.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Text;

namespace CodeX.Application.Features.WhatsApp.Commands.ProcessIncomingMessage
{
    public record ProcessIncomingMessageCommand : IRequest<string>
    {
        public Guid? BranchId { get; init; }
        public string From { get; init; } = string.Empty;
        public string MessageBody { get; init; } = string.Empty;
        public BookingSource Source { get; init; } = BookingSource.WhatsApp;
    }

    public class ProcessIncomingMessageCommandHandler : IRequestHandler<ProcessIncomingMessageCommand, string>
    {
        private readonly IApplicationDbContext _context;
        private readonly ISender _mediator;
        private readonly IWhatsAppService _whatsappService;
        private readonly ISmsService _smsService;
        private readonly IQueueNotificationService _notificationService;
        private readonly Microsoft.Extensions.DependencyInjection.IServiceScopeFactory _serviceScopeFactory;
        private readonly IChatSessionCache _chatSessionCache;

        public ProcessIncomingMessageCommandHandler(IApplicationDbContext context, ISender mediator, IWhatsAppService whatsappService, ISmsService smsService, IQueueNotificationService notificationService, Microsoft.Extensions.DependencyInjection.IServiceScopeFactory serviceScopeFactory, IChatSessionCache chatSessionCache)
        {
            _context = context;
            _mediator = mediator;
            _whatsappService = whatsappService;
            _smsService = smsService;
            _notificationService = notificationService;
            _serviceScopeFactory = serviceScopeFactory;
            _chatSessionCache = chatSessionCache;
        }

        private async Task LogMessage(Guid branchId, string phone, string type, string status, string? error = null, Guid? tokenId = null, string? messageBody = null)
        {
            var log = new MessageLog
            {
                BranchId = branchId,
                RecipientPhone = phone,
                MessageType = type,
                Status = status,
                ErrorMessage = error,
                TokenId = tokenId,
                MessageBody = messageBody
            };
            _context.MessageLogs.Add(log);
            await _context.SaveChangesAsync(default);
        }

        public async Task<string> Handle(ProcessIncomingMessageCommand request, CancellationToken cancellationToken)
        {
            var fromPhone = NormalizationHelper.NormalizePhone(request.From);
            var session = await _chatSessionCache.GetSessionAsync(fromPhone, request.BranchId, cancellationToken);

            if (session == null)
            {
                session = new ChatSession
                {
                    PhoneNumber = fromPhone,
                    BranchId = request.BranchId,
                    CurrentState = "START",
                    Language = string.Empty
                };
            }

            session.BranchId = request.BranchId;
            session.LastMessage = request.MessageBody.Trim();

            var body = request.MessageBody.Trim();
            var bodyLower = body.ToLowerInvariant();

            var emergencies = new[] { "heart attack", "chest pain", "emergency", "हार्ट अटैक", "सीने में दर्द", "सांस लेने में तकलीफ" };
            if (emergencies.Any(e => bodyLower.Contains(e)))
            {
                return WhatsAppTranslationHelper.Get(session.Language, "EMERGENCY_ALERT");
            }

            // Global Zero Command to change language
            if (bodyLower == "0")
            {
                session.CurrentState = "LANGUAGE_SELECTION";
                return CodeX.Application.Common.Helpers.WhatsAppTranslationHelper.Get("3", "WELCOME_LANGUAGE", await GetHospitalName(request.BranchId, cancellationToken));
            }

            // Global commands to reset session (Main Menu)
            if (bodyLower == "9" || bodyLower == "hi" || bodyLower == "hello" || bodyLower == "status" || bodyLower == "menu" || bodyLower == "back")
            {
                ResetSession(session);
                
                // If they explicitly typed status, let's log it but it will just reset and show them the main menu (which has the status option)
            }

            // Log Incoming Message
            var incomingLogType = request.Source == BookingSource.Telegram ? "IncomingTelegram" : "IncomingWhatsApp";
            await LogMessage(request.BranchId ?? Guid.Empty, fromPhone, incomingLogType, "Received", messageBody: body);

            var response = session.CurrentState switch
            {
                "START" => await HandleStart(session, cancellationToken),
                "SELECT_PATIENT" => await HandleSelectPatient(session, body, cancellationToken),
                "LANGUAGE_SELECTION" => await HandleLanguageSelection(session, body, cancellationToken),
                "AWAITING_NAME" => await HandleRegistration(session, body, cancellationToken),
                "ACTIVE_APPOINTMENT_MENU" => await HandleActiveAppointmentMenu(session, body, cancellationToken),
                "SKIPPED_APPOINTMENT_MENU" => await HandleSkippedAppointmentMenu(session, body, cancellationToken),
                "SELECT_DOCTOR" => await HandleSelectDoctor(session, bodyLower, cancellationToken),
                "SELECT_SESSION" => await HandleSelectSession(session, bodyLower, cancellationToken),
                "CONFIRM" => await HandleConfirm(session, bodyLower, request.Source, cancellationToken),
                "CONFIRM_CANCEL" => await HandleConfirmCancel(session, body, cancellationToken),
                "AWAITING_RATING_SCORE" => await HandleRatingScore(session, bodyLower, cancellationToken),
                "AWAITING_RATING_COMMENT" => await HandleRatingComment(session, body, cancellationToken),
                "CONFIRM_DISCONTINUE" => await HandleConfirmDiscontinue(session, body, cancellationToken),
                _ => HandleUnknown(session)
            };

            // Save to Cache (Write-Behind)
            _chatSessionCache.SetSession(session);

            return response;
        }

        private static void ResetSession(ChatSession session)
        {
            session.CurrentState = "START";
            session.SelectedDoctorId = null;
            session.SelectedSessionId = null;
            session.SelectedPatientId = null;
            session.AvailablePatientIds = null;
        }

        private async Task<string> GetHospitalName(Guid? branchId, CancellationToken ct)
        {
            if (!branchId.HasValue) return "ABC Clinic";
            // IgnoreQueryFilters: webhook is anonymous (no OrgId in context), so global filter must be bypassed
            var branch = await _context.Branches.Include(b => b.Organization).FirstOrDefaultAsync(b => !b.IsDeleted && b.Id == branchId.Value, ct);
            return branch?.Organization?.Name ?? branch?.Name ?? "ABC Clinic";
        }

        private static string HandleUnknown(ChatSession session)
        {
            if (session.CurrentState != "START" && session.CurrentState != "CONFIRM_DISCONTINUE")
            {
                // Temporarily store current state in LastMessage so we can resume if they select 2
                session.LastMessage = session.CurrentState;
                session.CurrentState = "CONFIRM_DISCONTINUE";
                return WhatsAppTranslationHelper.Get(session.Language, "CONFIRM_DISCONTINUE_PROMPT");
            }

            ResetSession(session);
            return WhatsAppTranslationHelper.Get(session.Language, "INVALID_INPUT_HELP");
        }

        private async Task<string> HandleConfirmDiscontinue(ChatSession session, string body, CancellationToken ct)
        {
            if (body == "2") // No, Continue
            {
                // Restore previous state
                session.CurrentState = session.LastMessage ?? "START";
                session.LastMessage = "";

                // Return a generic 'please continue' message, or we could re-trigger the previous prompt
                // But since we can't easily re-trigger without duplicating state logic, we just ask them to provide input again.
                return WhatsAppTranslationHelper.Get(session.Language, "INVALID_INPUT");
            }

            if (body == "1") // Yes, Discontinue
            {
                ResetSession(session);
                // The user requested to see the menu based on their booking status
                return await HandleStart(session, ct);
            }

            // Still invalid
            return WhatsAppTranslationHelper.Get(session.Language, "CONFIRM_DISCONTINUE_PROMPT");
        }
        private async Task<string> HandleLanguageSelection(ChatSession session, string body, CancellationToken ct)
        {
            if (body == "1" || body == "2" || body == "3")
            {
                session.Language = body;
                session.CurrentState = "START";
                return await HandleStart(session, ct); // Automatically proceed
            }

            return WhatsAppTranslationHelper.Get("3", "WELCOME_LANGUAGE", await GetHospitalName(session.BranchId, ct));
        }

        private async Task<string> HandleHelp(ChatSession session, CancellationToken ct)
        {
            var sb = new StringBuilder();

            if (session.Language == "1") sb.AppendLine("❓ सहायता केंद्र / Help Menu\n\nउपलब्ध कमांड (Type the word):");
            else if (session.Language == "2") sb.AppendLine("❓ मदत केंद्र / Help Menu\n\nउपलब्ध कमांड (Type the word):");
            else sb.AppendLine("❓ Help Menu\n\nAvailable Commands (Type the word):");

            sb.AppendLine("🏠 *HI* - Main Menu / मुख्य मेन्यू");
            sb.AppendLine("🌐 *LANGUAGE* - Change Language / भाषा बदलें");

            // IgnoreQueryFilters: webhook is anonymous (no OrgId in context), so global filter must be bypassed
            var patient = await GetSessionPatientAsync(session, ct);
            if (patient != null && session.BranchId.HasValue)
            {
                // IgnoreQueryFilters: webhook is anonymous (no OrgId in context), so global filter must be bypassed
                var activeToken = await _context.Tokens
                    
                    .Include(t => t.Queue)
                    .Where(t => !t.IsDeleted && t.PatientId == patient.Id &&
                                t.Queue.BranchId == session.BranchId &&
                                (t.Status == TokenStatus.Pending || t.Status == TokenStatus.Called))
                    .FirstOrDefaultAsync(ct);

                if (activeToken != null)
                {
                    sb.AppendLine("📊 *STATUS* - Queue Status / कतार नंबर");
                    sb.AppendLine("📋 *APPOINTMENT* - View Details / विवरण");
                    sb.AppendLine("🔄 *RESCHEDULE* - Reschedule / समय बदलें");
                    sb.AppendLine("❌ *CANCEL* - Cancel Booking / रद्द करें");
                }
                else
                {
                    var skippedToken = await _context.Tokens
                        
                        .Include(t => t.Queue)
                        .Where(t => !t.IsDeleted && t.PatientId == patient.Id &&
                                    t.Queue.BranchId == session.BranchId &&
                                    t.Status == TokenStatus.Skipped)
                        .FirstOrDefaultAsync(ct);

                    if (skippedToken != null)
                    {
                        sb.AppendLine("🔁 *REJOIN* - Rejoin Queue / कतार में जुड़ें");
                    }
                }
            }

            return sb.ToString();
        }

        
        private async Task<string> HandleSkippedAppointmentMenu(ChatSession session, string body, CancellationToken ct)
        {
            if (body == "1")
            {
                return await HandleRejoin(session, ct);
            }
            return WhatsAppTranslationHelper.Get(session.Language, "INVALID_INPUT");
        }

        private async Task<string> HandleActiveAppointmentMenu(ChatSession session, string body, CancellationToken ct)
        {
            return body switch
            {
                "1" => await HandleStatus(session, ct),
                "2" => await HandleAppointmentDetails(session, ct),
                "3" => await HandleReschedule(session, ct),
                "4" => await HandleCancel(session, ct),
                _ => WhatsAppTranslationHelper.Get(session.Language, "INVALID_INPUT")
            };
        }

        private async Task<string> HandleConfirmCancel(ChatSession session, string body, CancellationToken ct)
        {
            if (body == "1")
            {
                var phoneVars = NormalizationHelper.GetPhoneVariations(session.PhoneNumber);
                var patient = await GetSessionPatientAsync(session, ct);
                if (patient == null) return WhatsAppTranslationHelper.Get(session.Language, "NO_ACTIVE_APP");

                // IgnoreQueryFilters: webhook is anonymous (no OrgId in context), so global filter must be bypassed
                var activeToken = await _context.Tokens
                    
                    .Include(t => t.Queue)
                    .Where(t => !t.IsDeleted && t.PatientId == patient.Id &&
                                t.Queue.BranchId == session.BranchId &&
                                (t.Status == TokenStatus.Pending || t.Status == TokenStatus.Called))
                    .OrderByDescending(t => t.BookedAt)
                    .FirstOrDefaultAsync(ct);

                if (activeToken == null)
                {
                    ResetSession(session);
                    return WhatsAppTranslationHelper.Get(session.Language, "NO_ACTIVE_APP");
                }

                activeToken.Status = TokenStatus.Cancelled;
                ResetSession(session);

                // Ensure DB is updated before notifying clients
                await _context.SaveChangesAsync(ct);

                // Notify via SignalR
                try
                {
                    await _notificationService.NotifyTokenUpdated(activeToken.Queue.BranchId, activeToken.QueueId, activeToken.Queue.CurrentTokenNumber);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[SIGNALR_ERROR] {ex.Message}");
                }

                return WhatsAppTranslationHelper.Get(session.Language, "CANCEL_SUCCESS");
            }
            else if (body == "2")
            {
                ResetSession(session);
                return await HandleStart(session, ct);
            }

            return WhatsAppTranslationHelper.Get(session.Language, "INVALID_INPUT");
        }

        private async Task<string> HandleAppointmentDetails(ChatSession session, CancellationToken ct)
        {
            var phoneVars = NormalizationHelper.GetPhoneVariations(session.PhoneNumber);
            var patient = await GetSessionPatientAsync(session, ct);
            if (patient == null) return WhatsAppTranslationHelper.Get(session.Language, "NO_ACTIVE_APP");

            // IgnoreQueryFilters: webhook is anonymous (no OrgId in context), so global filter must be bypassed
            var activeToken = await _context.Tokens
                
                .Include(t => t.Queue)
                .ThenInclude(q => q.Doctor)
                .Include(t => t.Queue.Session)
                .Include(t => t.Patient)
                .Where(t => !t.IsDeleted && t.PatientId == patient.Id &&
                            t.Queue.BranchId == session.BranchId &&
                            (t.Status == TokenStatus.Pending || t.Status == TokenStatus.Called))
                .OrderByDescending(t => t.BookedAt)
                .FirstOrDefaultAsync(ct);

            if (activeToken == null)
            {
                return WhatsAppTranslationHelper.Get(session.Language, "NO_ACTIVE_APP");
            }

            var tzBranchApp = await _context.Branches.Include(b => b.Organization).FirstOrDefaultAsync(b => b.Id == session.BranchId.Value, ct);
            int appAvgWaitMins = 10;
            if (tzBranchApp?.Organization?.SettingsJson != null)
            {
                try
                {
                    var settings = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(tzBranchApp.Organization.SettingsJson);
                    if (settings.TryGetProperty("AvgConsultationTimeMins", out var timeProp) && timeProp.TryGetInt32(out var mins))
                    {
                        appAvgWaitMins = mins;
                    }
                }
                catch { }
            }

            int appWaitTokens = activeToken.TokenNumber - activeToken.Queue.CurrentTokenNumber;
            int appWaitMins = appWaitTokens > 0 ? appWaitTokens * appAvgWaitMins : 0;
            string appWaitTimeStr = appWaitMins > 0 ? $"\n⏳ Estimated Wait: {appWaitMins} mins" : "";

            var appResponse = WhatsAppTranslationHelper.Get(session.Language, "APPOINTMENT_DETAILS",
                activeToken.Patient.Name,
                activeToken.Queue.Doctor?.Name ?? "Unknown",
                activeToken.TokenNumber.ToString(),
                activeToken.Queue.Session?.SessionName ?? "Unknown");

            return appResponse + appWaitTimeStr;
        }

        private async Task<string> HandleReschedule(ChatSession session, CancellationToken ct)
        {
            var phoneVars = NormalizationHelper.GetPhoneVariations(session.PhoneNumber);
            var patient = await GetSessionPatientAsync(session, ct);
            if (patient == null) return WhatsAppTranslationHelper.Get(session.Language, "NO_ACTIVE_APP");

            // IgnoreQueryFilters: webhook is anonymous (no OrgId in context), so global filter must be bypassed
            var activeToken = await _context.Tokens
                
                .Include(t => t.Queue)
                .Where(t => !t.IsDeleted && t.PatientId == patient.Id &&
                            t.Queue.BranchId == session.BranchId &&
                            (t.Status == TokenStatus.Pending || t.Status == TokenStatus.Called))
                .OrderByDescending(t => t.BookedAt)
                .FirstOrDefaultAsync(ct);

            if (activeToken != null)
            {
                // DO NOT cancel the token here! If they abort, they should keep their appointment.
                // We will cancel it ONLY if they successfully confirm a new appointment.
                session.SelectedDoctorId = activeToken.Queue.DoctorId;
            }

            // Immediately list sessions for the selected doctor
            if (session.SelectedDoctorId.HasValue)
            {
                var sessions = await GetAvailableSessions(session.SelectedDoctorId.Value, session.BranchId, ct);
                if (!sessions.Any())
                {
                    ResetSession(session);
                    return WhatsAppTranslationHelper.Get(session.Language, "NO_SESSIONS");
                }

                var builder = new StringBuilder();
                for (int i = 0; i < sessions.Count; i++)
                {
                    builder.AppendLine($"*{i + 1}.* {sessions[i].SessionName} _({sessions[i].StartTime:hh\\:mm} - {sessions[i].EndTime:hh\\:mm})_");
                }
                session.CurrentState = "SELECT_SESSION";
                return WhatsAppTranslationHelper.Get(session.Language, "RESCHEDULE_PROMPT", builder.ToString());
            }

            ResetSession(session);
            return await HandleStart(session, ct);
        }

        private async Task<string> HandleConfirm(ChatSession session, string body, BookingSource source, CancellationToken ct)
        {
            if (body == "2")
            {
                ResetSession(session);
                return await HandleStart(session, ct);
            }
            else if (body != "1")
            {
                return WhatsAppTranslationHelper.Get(session.Language, "INVALID_INPUT_HELP");
            }

            if (!session.SelectedDoctorId.HasValue || !session.SelectedSessionId.HasValue || !session.BranchId.HasValue)
            {
                ResetSession(session);
                return WhatsAppTranslationHelper.Get(session.Language, "NO_SESSIONS");
            }

            // IgnoreQueryFilters: webhook is anonymous (no OrgId in context), so global filter must be bypassed
            var tzBranch = await _context.Branches.Include(b => b.Organization).FirstOrDefaultAsync(b => b.Id == session.BranchId.Value, ct);
            var today = TimeHelper.GetBranchLocalToday(tzBranch?.Timezone);
            var tomorrow = today.AddDays(1);
            var queue = await _context.DailyQueues
                
                .Include(q => q.Doctor)
                .Include(q => q.Session)
                .FirstOrDefaultAsync(q =>
                    !q.IsDeleted &&
                    q.BranchId == session.BranchId.Value &&
                    q.DoctorId == session.SelectedDoctorId &&
                    q.SessionId == session.SelectedSessionId &&
                    q.QueueDate >= today &&
                    q.QueueDate < tomorrow, ct);

            if (queue != null && (queue.Status == QueueStatus.Completed || queue.Status == QueueStatus.Cancelled))
            {
                ResetSession(session);
                return WhatsAppTranslationHelper.Get(session.Language, "SESSION_CANCELLED");
            }

            if (queue == null)
            {
                ResetSession(session);
                return WhatsAppTranslationHelper.Get(session.Language, "SESSION_CANCELLED");
            }

            // IgnoreQueryFilters: webhook is anonymous (no OrgId in context), so global filter must be bypassed
            var patient = await GetSessionPatientAsync(session, ct);

            try
            {
                using var scope = _serviceScopeFactory.CreateScope();
                var scopedMediator = scope.ServiceProvider.GetRequiredService<ISender>();
                var scopedContext = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

                var result = await scopedMediator.Send(new CreateTokenCommand
                {
                    QueueId = queue.Id,
                    PatientName = patient?.Name ?? "WhatsApp User",
                    PatientPhone = session.PhoneNumber,
                    Source = source
                }, ct);

                var tokenNum = result.TokenNumber;

                // Now that the new appointment is confirmed, cancel any old active appointments for this patient
                var oldTokens = await scopedContext.Tokens
                    .Where(t => !t.IsDeleted && t.PatientId == patient.Id && t.Id != result.TokenId &&
                                t.Queue.BranchId == session.BranchId &&
                                (t.Status == TokenStatus.Pending || t.Status == TokenStatus.Called))
                    .ToListAsync(ct);
                
                foreach(var oldToken in oldTokens)
                {
                    oldToken.Status = TokenStatus.Cancelled;
                }
                if (oldTokens.Any())
                {
                    await scopedContext.SaveChangesAsync(ct);
                }

                ResetSession(session);

                int avgWaitMins = 10;
                if (tzBranch?.Organization?.SettingsJson != null)
                {
                    try
                    {
                        var settings = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(tzBranch.Organization.SettingsJson);
                        if (settings.TryGetProperty("AvgConsultationTimeMins", out var timeProp) && timeProp.TryGetInt32(out var mins))
                        {
                            avgWaitMins = mins;
                        }
                    }
                    catch { }
                }

                int waitTokens = tokenNum - queue.CurrentTokenNumber;
                int waitMins = waitTokens > 0 ? waitTokens * avgWaitMins : 0;
                string waitTimeStr = waitMins > 0 ? $"\n⏳ Estimated Wait: {waitMins} mins" : "";

                var response = WhatsAppTranslationHelper.Get(session.Language, "SUCCESS_BOOKING",
                    tokenNum.ToString(),
                    queue.Doctor?.Name ?? "Unknown",
                    queue.Session?.SessionName ?? "Unknown",
                    $"{queue.Session?.StartTime:hh\\:mm} - {queue.Session?.EndTime:hh\\:mm}");

                response += waitTimeStr;

                // Log and Send Outgoing Notification (Handled by Webhook Controller usually, but logging for internal flow)
                var confirmationType = source == BookingSource.Telegram ? "BookingConfirmation_Telegram" : "BookingConfirmation_WhatsApp";
                await LogMessage(session.BranchId.Value, session.PhoneNumber, confirmationType, "Sent", tokenId: result.TokenId, messageBody: response);

                return response;
            }
            catch (Exception ex)
            {
                ResetSession(session);
                var msg = ex.InnerException?.Message ?? ex.Message;
                if (msg.Contains("already has an active token", StringComparison.OrdinalIgnoreCase))
                {
                    return WhatsAppTranslationHelper.Get(session.Language, "ALREADY_BOOKED");
                }
                return WhatsAppTranslationHelper.Get(session.Language, "BOOKING_ERROR", msg);
            }
        }

        private async Task<string> HandleSelectPatient(ChatSession session, string body, CancellationToken ct)
        {
            if (int.TryParse(body, out int index) && !string.IsNullOrEmpty(session.AvailablePatientIds))
            {
                var ids = session.AvailablePatientIds.Split(',');
                if (index >= 1 && index <= ids.Length)
                {
                    if (Guid.TryParse(ids[index - 1], out Guid patientId))
                    {
                        session.SelectedPatientId = patientId;
                        session.CurrentState = "START";
                        return await HandleStart(session, ct);
                    }
                }
            }
            return WhatsAppTranslationHelper.Get(session.Language, "INVALID_PATIENT_SELECTION");
        }

        private async Task<string> HandleStart(ChatSession session, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(session.Language))
            {
                session.CurrentState = "LANGUAGE_SELECTION";
                var bName = await GetHospitalName(session.BranchId, ct);
                return WhatsAppTranslationHelper.Get("3", "WELCOME_LANGUAGE", bName);
            }

            var phoneVars = NormalizationHelper.GetPhoneVariations(session.PhoneNumber);
            
            var patients = await _context.Patients
                .Where(p => !p.IsDeleted && phoneVars.Contains(p.Phone))
                .OrderBy(p => p.CreatedAt)
                .ToListAsync(ct);

            if (patients.Count > 1 && !session.SelectedPatientId.HasValue)
            {
                session.CurrentState = "SELECT_PATIENT";
                session.AvailablePatientIds = string.Join(",", patients.Select(p => p.Id));
                
                var sbOpts = new StringBuilder();
                for (int i = 0; i < patients.Count; i++)
                {
                    sbOpts.AppendLine($"{i + 1}️⃣ {patients[i].Name}");
                }
                
                return WhatsAppTranslationHelper.Get(session.Language, "MULTIPLE_PATIENTS", sbOpts.ToString().Trim());
            }

            if (patients.Count == 1 && !session.SelectedPatientId.HasValue)
            {
                session.SelectedPatientId = patients[0].Id;
            }

            // IgnoreQueryFilters: webhook is anonymous (no OrgId in context), so global filter must be bypassed
            var patient = await GetSessionPatientAsync(session, ct);
            if (patient == null || string.IsNullOrWhiteSpace(patient.Name))
            {
                session.CurrentState = "AWAITING_NAME";
                return WhatsAppTranslationHelper.Get(session.Language, "ASK_NAME");
            }

            // Check for active appointment
            // IgnoreQueryFilters: webhook is anonymous (no OrgId in context), so global filter must be bypassed
            var activeToken = await _context.Tokens
                
                .Include(t => t.Queue)
                .ThenInclude(q => q.Doctor)
                .Where(t => !t.IsDeleted && t.PatientId == patient.Id &&
                            t.Queue.BranchId == session.BranchId &&
                            (t.Status == TokenStatus.Pending || t.Status == TokenStatus.Called))
                .OrderByDescending(t => t.BookedAt)
                .FirstOrDefaultAsync(ct);

            if (activeToken != null)
            {
                session.CurrentState = "ACTIVE_APPOINTMENT_MENU";
                return WhatsAppTranslationHelper.Get(session.Language, "ACTIVE_APPOINTMENT",
                    activeToken.Queue.Doctor?.Name ?? "Unknown",
                    activeToken.TokenNumber.ToString());
            }

            // Check for skipped appointment
            var skippedToken = await _context.Tokens
                .Include(t => t.Queue)
                .ThenInclude(q => q.Doctor)
                .Where(t => !t.IsDeleted && t.PatientId == patient.Id &&
                            t.Queue.BranchId == session.BranchId &&
                            t.Status == TokenStatus.Skipped)
                .OrderByDescending(t => t.BookedAt)
                .FirstOrDefaultAsync(ct);

            if (skippedToken != null)
            {
                session.CurrentState = "SKIPPED_APPOINTMENT_MENU";
                return WhatsAppTranslationHelper.Get(session.Language, "MISSED_APP_MENU",
                    skippedToken.Queue.Doctor?.Name ?? "Unknown",
                    skippedToken.TokenNumber.ToString());
            }

            var doctors = await GetAvailableDoctors(session.BranchId, ct);
            if (!doctors.Any())
            {
                return WhatsAppTranslationHelper.Get(session.Language, "NO_DOCTORS");
            }

            var builder = new StringBuilder();
            for (int i = 0; i < doctors.Count; i++)
            {
                builder.AppendLine($"*{i + 1}.* Dr. {doctors[i].Name} _({doctors[i].Specialization})_");
            }

            session.CurrentState = "SELECT_DOCTOR";
            return WhatsAppTranslationHelper.Get(session.Language, "SELECT_DOCTOR", patient.Name, builder.ToString());
        }

        private async Task<string> HandleRegistration(ChatSession session, string name, CancellationToken ct)
        {
            var phoneVars = NormalizationHelper.GetPhoneVariations(session.PhoneNumber);
            // IgnoreQueryFilters: webhook is anonymous (no OrgId in context), so global filter must be bypassed
            var patient = await GetSessionPatientAsync(session, ct);
            if (patient == null)
            {
                var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == session.BranchId, ct);
                patient = new Patient
                {
                    Phone = session.PhoneNumber,
                    Name = name.Trim(),
                    OrganizationId = branch?.OrganizationId ?? Guid.Empty
                };
                _context.Patients.Add(patient);
            }
            else
            {
                patient.Name = name.Trim();
            }

            await _context.SaveChangesAsync(ct);
            return await HandleStart(session, ct);
        }

        private async Task<string> HandleSelectDoctor(ChatSession session, string body, CancellationToken ct)
        {
            if (!int.TryParse(body, out var index))
            {
                return WhatsAppTranslationHelper.Get(session.Language, "INVALID_INPUT");
            }

            var doctors = await GetAvailableDoctors(session.BranchId, ct);
            if (index <= 0 || index > doctors.Count)
            {
                return WhatsAppTranslationHelper.Get(session.Language, "INVALID_INPUT");
            }

            var selectedDoctor = doctors[index - 1];
            session.SelectedDoctorId = selectedDoctor.Id;

            var sessions = await GetAvailableSessions(selectedDoctor.Id, session.BranchId, ct);
            if (!sessions.Any())
            {
                ResetSession(session);
                return WhatsAppTranslationHelper.Get(session.Language, "NO_SESSIONS");
            }

            var builder = new StringBuilder();
            for (int i = 0; i < sessions.Count; i++)
            {
                builder.AppendLine($"*{i + 1}.* {sessions[i].SessionName} _({sessions[i].StartTime:hh\\:mm} - {sessions[i].EndTime:hh\\:mm})_");
            }

            session.CurrentState = "SELECT_SESSION";
            return WhatsAppTranslationHelper.Get(session.Language, "SELECT_SESSION", selectedDoctor.Name, selectedDoctor.Specialization, builder.ToString());
        }

        private async Task<string> HandleSelectSession(ChatSession session, string body, CancellationToken ct)
        {
            if (!int.TryParse(body, out var index) || !session.SelectedDoctorId.HasValue)
            {
                return WhatsAppTranslationHelper.Get(session.Language, "INVALID_INPUT");
            }

            var sessions = await GetAvailableSessions(session.SelectedDoctorId.Value, session.BranchId, ct);
            if (index <= 0 || index > sessions.Count)
            {
                return WhatsAppTranslationHelper.Get(session.Language, "INVALID_INPUT");
            }

            var selectedSession = sessions[index - 1];
            session.SelectedSessionId = selectedSession.Id;

            // IgnoreQueryFilters: webhook is anonymous (no OrgId in context), so global filter must be bypassed
            var doctor = await _context.Doctors.FirstOrDefaultAsync(d => !d.IsDeleted && d.Id == session.SelectedDoctorId.Value, ct);
            session.CurrentState = "CONFIRM";

            // IgnoreQueryFilters: webhook is anonymous (no OrgId in context), so global filter must be bypassed
            var patient = await GetSessionPatientAsync(session, ct);

            return WhatsAppTranslationHelper.Get(session.Language, "CONFIRM_DETAILS",
                patient?.Name ?? "Unknown",
                doctor?.Name ?? "Unknown",
                doctor?.Specialization ?? "N/A",
                selectedSession.SessionName,
                $"{selectedSession.StartTime:hh\\:mm} - {selectedSession.EndTime:hh\\:mm}");
        }

        private async Task<string> HandleRatingScore(ChatSession session, string body, CancellationToken ct)
        {
            if (!int.TryParse(body, out var score) || score < 1 || score > 5 || !session.SelectedSessionId.HasValue)
            {
                return WhatsAppTranslationHelper.Get(session.Language, "RATING_PROMPT");
            }

            try
            {
                using var scope = _serviceScopeFactory.CreateScope();
                var scopedMediator = scope.ServiceProvider.GetRequiredService<ISender>();

                await scopedMediator.Send(new CreateRatingCommand
                {
                    TokenId = session.SelectedSessionId.Value,
                    Score = score
                }, ct);

                session.CurrentState = "AWAITING_RATING_COMMENT";
                return WhatsAppTranslationHelper.Get(session.Language, "COMMENT_PROMPT");
            }
            catch (Exception)
            {
                ResetSession(session);
                return WhatsAppTranslationHelper.Get(session.Language, "INVALID_INPUT_HELP");
            }
        }

        private async Task<string> HandleRatingComment(ChatSession session, string body, CancellationToken ct)
        {
            if (!body.Trim().Equals("skip", StringComparison.OrdinalIgnoreCase) && session.SelectedSessionId.HasValue)
            {
                // IgnoreQueryFilters: webhook is anonymous (no OrgId in context), so global filter must be bypassed
                var rating = await _context.Ratings.IgnoreQueryFilters().FirstOrDefaultAsync(r => !r.IsDeleted && r.TokenId == session.SelectedSessionId.Value, ct);
                if (rating != null)
                {
                    rating.Comment = body.Trim();
                }
            }

            ResetSession(session);
            return WhatsAppTranslationHelper.Get(session.Language, "FEEDBACK_SUCCESS");
        }

        private async Task<string> HandleStatus(ChatSession session, CancellationToken ct)
        {
            var phoneVars = NormalizationHelper.GetPhoneVariations(session.PhoneNumber);
            var patient = await GetSessionPatientAsync(session, ct);
            if (patient == null) return WhatsAppTranslationHelper.Get(session.Language, "NO_ACTIVE_APP");

            // IgnoreQueryFilters: webhook is anonymous (no OrgId in context), so global filter must be bypassed
            var activeToken = await _context.Tokens
                
                .Include(t => t.Queue)
                .ThenInclude(q => q.Doctor)
                .Where(t => !t.IsDeleted && t.PatientId == patient.Id &&
                            t.Queue.BranchId == session.BranchId &&
                            (t.Status == TokenStatus.Pending || t.Status == TokenStatus.Called))
                .OrderByDescending(t => t.BookedAt)
                .FirstOrDefaultAsync(ct);

            if (activeToken == null)
            {
                return WhatsAppTranslationHelper.Get(session.Language, "NO_ACTIVE_APP");
            }

            var peopleAhead = await _context.Tokens
                
                .CountAsync(t => !t.IsDeleted && t.QueueId == activeToken.QueueId &&
                                 t.Status == TokenStatus.Pending &&
                                 t.TokenNumber < activeToken.TokenNumber, ct);

            return WhatsAppTranslationHelper.Get(session.Language, "QUEUE_STATUS",
                activeToken.Queue.Doctor?.Name ?? "Unknown",
                activeToken.Queue.CurrentTokenNumber.ToString(),
                activeToken.TokenNumber.ToString(),
                peopleAhead.ToString(),
                (peopleAhead * 10).ToString());
        }

        private async Task<string> HandleCancel(ChatSession session, CancellationToken ct)
        {
            var phoneVars = NormalizationHelper.GetPhoneVariations(session.PhoneNumber);
            var patient = await GetSessionPatientAsync(session, ct);
            if (patient == null) return WhatsAppTranslationHelper.Get(session.Language, "NO_ACTIVE_APP");

            // IgnoreQueryFilters: webhook is anonymous (no OrgId in context), so global filter must be bypassed
            var activeToken = await _context.Tokens
                
                .Include(t => t.Queue)
                .Where(t => !t.IsDeleted && t.PatientId == patient.Id &&
                            t.Queue.BranchId == session.BranchId &&
                            (t.Status == TokenStatus.Pending || t.Status == TokenStatus.Called))
                .OrderByDescending(t => t.BookedAt)
                .FirstOrDefaultAsync(ct);

            if (activeToken == null)
            {
                return WhatsAppTranslationHelper.Get(session.Language, "NO_ACTIVE_APP");
            }

            session.CurrentState = "CONFIRM_CANCEL";
            return WhatsAppTranslationHelper.Get(session.Language, "CANCEL_PROMPT");
        }

        private async Task<string> HandleRejoin(ChatSession session, CancellationToken ct)
        {
            var phoneVars = NormalizationHelper.GetPhoneVariations(session.PhoneNumber);
            var patient = await GetSessionPatientAsync(session, ct);
            if (patient == null) return WhatsAppTranslationHelper.Get(session.Language, "NO_SKIPPED_APP");

            // IgnoreQueryFilters: webhook is anonymous (no OrgId in context), so global filter must be bypassed
            var skippedToken = await _context.Tokens
                
                .Include(t => t.Queue)
                .ThenInclude(q => q.Doctor)
                .Where(t => !t.IsDeleted && t.PatientId == patient.Id &&
                            t.Queue.BranchId == session.BranchId &&
                            t.Status == TokenStatus.Skipped)
                .OrderByDescending(t => t.BookedAt)
                .FirstOrDefaultAsync(ct);

            if (skippedToken == null)
            {
                return WhatsAppTranslationHelper.Get(session.Language, "NO_SKIPPED_APP");
            }

            skippedToken.Status = TokenStatus.Pending;
            skippedToken.TokenNumber = await _context.Tokens.CountAsync(t => !t.IsDeleted && t.QueueId == skippedToken.QueueId, ct) + 1; // Put them at the end of the line

            // Ensure DB is updated before notifying clients
            await _context.SaveChangesAsync(ct);

            // Notify via SignalR
            try
            {
                await _notificationService.NotifyTokenUpdated(skippedToken.Queue.BranchId, skippedToken.QueueId, skippedToken.Queue.CurrentTokenNumber);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SIGNALR_ERROR] {ex.Message}");
            }

            return WhatsAppTranslationHelper.Get(session.Language, "REJOIN_SUCCESS", skippedToken.TokenNumber.ToString());
        }

        private async Task<List<Doctor>> GetAvailableDoctors(Guid? branchId, CancellationToken ct)
        {
            if (!branchId.HasValue)
                return new List<Doctor>();

            // IgnoreQueryFilters: webhook is anonymous (no OrgId in context), so global filter must be bypassed
            var tzBranch = await _context.Branches
                
                .FirstOrDefaultAsync(b => b.Id == branchId.Value, ct);

            var today = TimeHelper.GetBranchLocalToday(tzBranch?.Timezone);
            var tomorrow = today.AddDays(1);
            int currentDayOfWeek = (int)today.DayOfWeek;

            var activeSessions = await _context.Sessions
                
                .Include(s => s.Doctor)
                .Where(s => !s.IsDeleted && s.BranchId == branchId.Value && s.IsActive &&
                            s.Doctor != null && !s.Doctor.IsDeleted && s.Doctor.IsActive &&
                            (s.IsDaily || s.DayOfWeek == currentDayOfWeek))
                .ToListAsync(ct);

            var todayQueues = await _context.DailyQueues
                
                .Where(q => !q.IsDeleted && q.BranchId == branchId.Value && q.QueueDate >= today && q.QueueDate < tomorrow)
                .ToListAsync(ct);

            var availableDoctors = new List<Doctor>();
            foreach (var session in activeSessions)
            {
                var q = todayQueues.FirstOrDefault(x => x.SessionId == session.Id);

                // Only include doctors whose session has been explicitly started (q != null)
                if (q == null || q.Status == QueueStatus.Completed || q.Status == QueueStatus.Cancelled)
                    continue;

                if (session.Doctor != null && !availableDoctors.Any(d => d.Id == session.Doctor.Id))
                    availableDoctors.Add(session.Doctor);
            }

            return availableDoctors.OrderBy(d => d.Name).ToList();
        }

        private async Task<List<Session>> GetAvailableSessions(Guid doctorId, Guid? branchId, CancellationToken ct)
        {
            if (!branchId.HasValue)
            {
                return new List<Session>();
            }

            var tzBranch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == branchId.Value, ct);
            var today = TimeHelper.GetBranchLocalToday(tzBranch?.Timezone);
            var tomorrow = today.AddDays(1);
            int currentDayOfWeek = (int)today.DayOfWeek;

            // IgnoreQueryFilters: webhook is anonymous (no OrgId in context), so global filter must be bypassed
            var activeSessions = await _context.Sessions
                
                .Where(s => !s.IsDeleted && s.BranchId == branchId.Value && s.DoctorId == doctorId && s.IsActive &&
                            (s.IsDaily || s.DayOfWeek == currentDayOfWeek))
                .ToListAsync(ct);

            var todayQueues = await _context.DailyQueues
                
                .Where(q => !q.IsDeleted && q.BranchId == branchId.Value && q.DoctorId == doctorId && q.QueueDate >= today && q.QueueDate < tomorrow)
                .ToListAsync(ct);

            var availableSessions = new List<Session>();
            foreach (var session in activeSessions)
            {
                var q = todayQueues.FirstOrDefault(x => x.SessionId == session.Id);

                // Only include sessions that have been explicitly started (q != null)
                if (q == null || q.Status == QueueStatus.Completed || q.Status == QueueStatus.Cancelled)
                    continue;

                availableSessions.Add(session);
            }

            return availableSessions.OrderBy(s => s.StartTime).ToList();
        }

    
        private async Task<Patient?> GetSessionPatientAsync(ChatSession session, CancellationToken ct)
        {
            if (session.SelectedPatientId.HasValue)
            {
                return await _context.Patients.FirstOrDefaultAsync(p => !p.IsDeleted && p.Id == session.SelectedPatientId.Value, ct);
            }
            else
            {
                var phoneVars = NormalizationHelper.GetPhoneVariations(session.PhoneNumber);
                return await _context.Patients.FirstOrDefaultAsync(p => !p.IsDeleted && phoneVars.Contains(p.Phone), ct);
            }
        }

}
}
