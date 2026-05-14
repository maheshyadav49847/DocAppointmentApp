using System.Text;
using CodeX.Application.Common.Interfaces;
using CodeX.Application.Features.Ratings.Commands.CreateRating;
using CodeX.Application.Features.Tokens.Commands.CreateToken;
using CodeX.Domain.Entities;
using CodeX.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Application.Features.WhatsApp.Commands.ProcessIncomingMessage
{
    public record ProcessIncomingMessageCommand : IRequest<string>
    {
        public Guid? BranchId { get; init; }
        public string From { get; init; } = string.Empty;
        public string MessageBody { get; init; } = string.Empty;
    }

    public class ProcessIncomingMessageCommandHandler : IRequestHandler<ProcessIncomingMessageCommand, string>
    {
        private readonly IApplicationDbContext _context;
        private readonly ISender _mediator;

        public ProcessIncomingMessageCommandHandler(IApplicationDbContext context, ISender mediator)
        {
            _context = context;
            _mediator = mediator;
        }

        public async Task<string> Handle(ProcessIncomingMessageCommand request, CancellationToken cancellationToken)
        {
            var fromPhone = NormalisePhone(request.From);
            var session = await _context.ChatSessions
                .FirstOrDefaultAsync(x => x.PhoneNumber == fromPhone && x.BranchId == request.BranchId, cancellationToken);

            if (session == null)
            {
                session = new ChatSession
                {
                    PhoneNumber = fromPhone,
                    BranchId = request.BranchId,
                    CurrentState = "START"
                };

                _context.ChatSessions.Add(session);
            }

            session.BranchId = request.BranchId;
            session.LastMessage = request.MessageBody.Trim();

            var body = request.MessageBody.Trim();
            var bodyLower = body.ToLowerInvariant();

            if (bodyLower is "hi" or "reset" or "start" or "menu")
            {
                ResetSession(session);
            }
            else if (bodyLower is "status" or "check")
            {
                return await HandleStatus(session, cancellationToken);
            }
            else if (bodyLower == "cancel")
            {
                return await HandleCancel(session, cancellationToken);
            }

            var response = session.CurrentState switch
            {
                "START" => await HandleStart(session, cancellationToken),
                "AWAITING_NAME" => await HandleRegistration(session, body, cancellationToken),
                "SELECT_DOCTOR" => await HandleSelectDoctor(session, bodyLower, cancellationToken),
                "SELECT_SESSION" => await HandleSelectSession(session, bodyLower, cancellationToken),
                "CONFIRM" => await HandleConfirm(session, bodyLower, cancellationToken),
                "AWAITING_RATING_SCORE" => await HandleRatingScore(session, bodyLower, cancellationToken),
                "AWAITING_RATING_COMMENT" => await HandleRatingComment(session, body, cancellationToken),
                _ => HandleUnknown(session)
            };

            await _context.SaveChangesAsync(cancellationToken);
            return response;
        }

        private static void ResetSession(ChatSession session)
        {
            session.CurrentState = "START";
            session.SelectedDoctorId = null;
            session.SelectedSessionId = null;
        }

        private static string HandleUnknown(ChatSession session)
        {
            ResetSession(session);
            return "⚠️ Maaf kijiye, main samajh nahi paya.\n\nKripya shuruwat se menu dekhne ke liye *HI* likhkar bhejein. 🙏";
        }

        private async Task<string> HandleConfirm(ChatSession session, string body, CancellationToken ct)
        {
            if (body != "confirm")
            {
                return "👉 Appointment pakka karne ke liye kripya *CONFIRM* likhkar bhejein.\n\nYa fir shuruwat se shuru karne ke liye *HI* likhein. ✨";
            }

            if (!session.SelectedDoctorId.HasValue || !session.SelectedSessionId.HasValue || !session.BranchId.HasValue)
            {
                ResetSession(session);
                return "⏳ Aapka pichla chunaav expire ho gaya hai.\n\nNaya appointment book karne ke liye kripya *HI* likhkar bhejein. 🙏";
            }

            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);
            var queue = await _context.DailyQueues
                .Include(q => q.Doctor)
                .Include(q => q.Session)
                .FirstOrDefaultAsync(q =>
                    q.BranchId == session.BranchId.Value &&
                    q.DoctorId == session.SelectedDoctorId &&
                    q.SessionId == session.SelectedSessionId &&
                    q.QueueDate >= today &&
                    q.QueueDate < tomorrow, ct);

            if (queue != null && (queue.Status == QueueStatus.Completed || queue.Status == QueueStatus.Cancelled))
            {
                ResetSession(session);
                string reason = queue.Status == QueueStatus.Cancelled ? "radd (Cancel) kar diya gaya hai. Doctor uplabdh nahi hain" : "khatam (Complete) ho chuka hai";
                return $"⚠️ Maaf kijiye, chuna hua session aaj {reason}.\n\nKripya dusre doctor ya session ko chunne ke liye *HI* likhkar bhejein. 🙏";
            }

            if (queue == null)
            {
                var masterSession = await _context.Sessions
                    .Include(s => s.Doctor)
                    .FirstOrDefaultAsync(s => s.Id == session.SelectedSessionId.Value, ct);

                if (masterSession == null || masterSession.Doctor == null)
                {
                    ResetSession(session);
                    return "⚠️ Maaf kijiye, chuna hua session abhi active nahi hai.\n\nKripya *HI* likhkar dobara try karein. 🙏";
                }

                queue = new DailyQueue
                {
                    Id = Guid.NewGuid(),
                    DoctorId = masterSession.DoctorId,
                    SessionId = masterSession.Id,
                    BranchId = session.BranchId.Value,
                    QueueDate = today,
                    CurrentTokenNumber = 0,
                    Status = QueueStatus.Open,
                    Doctor = masterSession.Doctor,
                    Session = masterSession
                };

                _context.DailyQueues.Add(queue);
                await _context.SaveChangesAsync(ct);
            }

            var patient = await _context.Patients.FirstOrDefaultAsync(p => p.Phone == session.PhoneNumber, ct);

            try
            {
                var tokenId = await _mediator.Send(new CreateTokenCommand
                {
                    QueueId = queue.Id,
                    PatientName = patient?.Name ?? "WhatsApp User",
                    PatientPhone = session.PhoneNumber,
                    Source = BookingSource.WhatsApp
                }, ct);

                var createdToken = await _context.Tokens.FirstOrDefaultAsync(t => t.Id == tokenId, ct);
                var tokenNum = createdToken?.TokenNumber ?? 0;

                ResetSession(session);

                return $"🎉 *APPOINTMENT SAFALTAPOORVAK BOOK HO GAYA!* 🎉\n" +
                       $"━━━━━━━━━━━━━━━━━━━━━\n\n" +
                       $"👨‍⚕️ *Doctor:* Dr. {queue.Doctor?.Name}\n" +
                       $"🕒 *Session:* {queue.Session?.SessionName}\n" +
                       $"🔢 *Token Number:* #{tokenNum}\n\n" +
                       $"💡 *Aage Kya Karein?*\n" +
                       $"• Apna live status dekhne ke liye kisi bhi waqt *STATUS* likhkar bhejein.\n" +
                       $"• Agar aap nahi aa sakte, toh *CANCEL* likhkar appointment radd kar sakte hain.\n\n" +
                       $"✨ _Swasth rahein, muskurate rahein!_";
            }
            catch (Exception ex)
            {
                ResetSession(session);
                var msg = ex.InnerException?.Message ?? ex.Message;
                if (msg.Contains("already has an active token", StringComparison.OrdinalIgnoreCase))
                {
                    return "ℹ️ Aapka pehle se hi is session me ek appointment book hai.\n\nApna live status dekhne ke liye kisi bhi waqt *STATUS* likhkar bhejein. ✨";
                }
                return $"⚠️ Appointment book karne me samasya aayi: {msg}\n\nKripya thodi der baad *HI* likhkar dobara try karein. 🙏";
            }
        }

        private async Task<string> HandleStart(ChatSession session, CancellationToken ct)
        {
            string hospitalName = "Humare Hospital";
            string branchName = "Main Branch";
            if (session.BranchId.HasValue)
            {
                var branch = await _context.Branches
                    .Include(b => b.Organization)
                    .FirstOrDefaultAsync(b => b.Id == session.BranchId.Value, ct);
                if (branch != null)
                {
                    hospitalName = branch.Organization?.Name ?? branch.Name;
                    branchName = branch.Name;
                }
            }

            var patient = await _context.Patients.FirstOrDefaultAsync(p => p.Phone == session.PhoneNumber, ct);
            if (patient == null || string.IsNullOrWhiteSpace(patient.Name))
            {
                session.CurrentState = "AWAITING_NAME";
                return $"🏥 *SWAGAT HAI* 🏥\n" +
                       $"🏢 *{hospitalName.ToUpper()}* ({branchName})\n" +
                       $"━━━━━━━━━━━━━━━━━━━━━\n\n" +
                       $"Lagta hai aap humare hospital me pehli baar aaye hain. 😊\n\n" +
                       $"👉 Kripya apna *Poora Naam* (Full Name) likhkar bhejein taaki hum aapka registration kar sakein:";
            }

            var doctors = await GetAvailableDoctors(session.BranchId, ct);
            if (!doctors.Any())
            {
                return "⚠️ Is branch me abhi koi doctor available nahi hain. Kripya thodi der baad try karein. 🙏";
            }

            var builder = new StringBuilder();
            builder.AppendLine($"🏥 *{hospitalName.ToUpper()}* ({branchName})");
            builder.AppendLine($"━━━━━━━━━━━━━━━━━━━━━\n");
            builder.AppendLine($"👋 Namaste *{patient.Name}*!\n");
            builder.AppendLine("👉 Kripya appointment book karne ke liye niche diye gaye list me se kisi ek *Doctor ka Number* chunein (Jaise 1 ya 2):\n");

            for (int i = 0; i < doctors.Count; i++)
            {
                builder.AppendLine($"*{i + 1}.* Dr. {doctors[i].Name} _({doctors[i].Specialization})_");
            }

            builder.AppendLine("\n━━━━━━━━━━━━━━━━━━━━━");
            builder.Append("📌 Apna pehle se book kiya hua number dekhne ke liye *STATUS* likhkar bhejein.");

            session.CurrentState = "SELECT_DOCTOR";
            return builder.ToString();
        }

        private async Task<string> HandleRegistration(ChatSession session, string name, CancellationToken ct)
        {
            var patient = await _context.Patients.FirstOrDefaultAsync(p => p.Phone == session.PhoneNumber, ct);
            if (patient == null)
            {
                patient = new Patient { Phone = session.PhoneNumber, Name = name.Trim() };
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
                return "⚠️ Galat chunaav.\n\nKripya upar di gayi list me se sahi *Number* (Jaise 1 ya 2) likhkar bhejein. 🙏";
            }

            var doctors = await GetAvailableDoctors(session.BranchId, ct);
            if (index <= 0 || index > doctors.Count)
            {
                return "⚠️ Galat chunaav.\n\nKripya upar di gayi list me se sahi *Number* (Jaise 1 ya 2) likhkar bhejein. 🙏";
            }

            var selectedDoctor = doctors[index - 1];
            session.SelectedDoctorId = selectedDoctor.Id;

            var sessions = await GetAvailableSessions(selectedDoctor.Id, session.BranchId, ct);
            if (!sessions.Any())
            {
                ResetSession(session);
                return $"⚠️ Maaf kijiye, *Dr. {selectedDoctor.Name}* ka aaj koi active session nahi hai.\n\nDusre doctor ko chunne ke liye kripya *HI* likhkar bhejein. 🙏";
            }

            var builder = new StringBuilder();
            builder.AppendLine($"👨‍⚕️ Aapne *Dr. {selectedDoctor.Name}* ko chuna hai.\n");
            builder.AppendLine("👉 Kripya milne ka samay (*Session*) chunne ke liye niche se ek *Number* bhejein:\n");

            for (int i = 0; i < sessions.Count; i++)
            {
                builder.AppendLine($"*{i + 1}.* {sessions[i].SessionName} _({sessions[i].StartTime:hh\\:mm} se {sessions[i].EndTime:hh\\:mm})_");
            }

            session.CurrentState = "SELECT_SESSION";
            return builder.ToString();
        }

        private async Task<string> HandleSelectSession(ChatSession session, string body, CancellationToken ct)
        {
            if (!int.TryParse(body, out var index) || !session.SelectedDoctorId.HasValue)
            {
                return "⚠️ Galat chunaav. Kripya sahi *Number* bhejein. 🙏";
            }

            var sessions = await GetAvailableSessions(session.SelectedDoctorId.Value, session.BranchId, ct);
            if (index <= 0 || index > sessions.Count)
            {
                return "⚠️ Galat chunaav. Kripya sahi *Number* bhejein. 🙏";
            }

            var selectedSession = sessions[index - 1];
            session.SelectedSessionId = selectedSession.Id;

            var doctor = await _context.Doctors.FirstOrDefaultAsync(d => d.Id == session.SelectedDoctorId.Value, ct);
            session.CurrentState = "CONFIRM";

            return $"📋 *APPOINTMENT DETAILS* 📋\n" +
                   $"━━━━━━━━━━━━━━━━━━━━━\n\n" +
                   $"👨‍⚕️ *Doctor:* Dr. {doctor?.Name}\n" +
                   $"🕒 *Session:* {selectedSession.SessionName}\n\n" +
                   $"👉 Sab details sahi hone par appointment pakka karne ke liye *CONFIRM* likhkar bhejein. ✅";
        }

        private async Task<string> HandleRatingScore(ChatSession session, string body, CancellationToken ct)
        {
            if (!int.TryParse(body, out var score) || score < 1 || score > 5 || !session.SelectedSessionId.HasValue)
            {
                return "⚠️ Kripya 1 se 5 ke beech ek sahi *Rating Number* (Jaise 5) likhkar bhejein. ⭐";
            }

            try
            {
                await _mediator.Send(new CreateRatingCommand
                {
                    TokenId = session.SelectedSessionId.Value,
                    Score = score
                }, ct);

                string stars = new string('⭐', score);
                session.CurrentState = "AWAITING_RATING_COMMENT";
                return $"🙏 *BOHOT BOHOT SHUKRIYA!* 🙏\n" +
                       $"━━━━━━━━━━━━━━━━━━━━━\n\n" +
                       $"Aapne humein diye hain: {stars} ({score}/5)\n\n" +
                       $"💬 Kya aap humare clinic/doctor ke baare me koi chhota sa sujhaav (feedback) likhna chahenge?\n\n" +
                       $"👉 Apna sujhaav likhkar bhejein, ya fir is step ko chhodne ke liye *SKIP* likhein. ✨";
            }
            catch (Exception)
            {
                ResetSession(session);
                return $"⚠️ Rating save karne me samasya aayi.\n\nKripya thodi der baad *HI* likhkar dobara try karein. 🙏";
            }
        }

        private async Task<string> HandleRatingComment(ChatSession session, string body, CancellationToken ct)
        {
            if (!body.Trim().Equals("skip", StringComparison.OrdinalIgnoreCase) && session.SelectedSessionId.HasValue)
            {
                var rating = await _context.Ratings.FirstOrDefaultAsync(r => r.TokenId == session.SelectedSessionId.Value, ct);
                if (rating != null)
                {
                    rating.Comment = body.Trim();
                }
            }

            ResetSession(session);
            return $"💖 *FEEDBACK SAFALTAPOORVAK DARJ HO GAYA!* 💖\n" +
                   $"━━━━━━━━━━━━━━━━━━━━━\n\n" +
                   $"Aapke keemti sujhaav ke liye hum aapke aabhari hain. Isse humein apni seva aur behtar banane me madad milti hai. 😊\n\n" +
                   $"✨ _Aapka din shubh ho, swasth rahein!_ ✨";
        }

        private async Task<string> HandleStatus(ChatSession session, CancellationToken ct)
        {
            if (!session.BranchId.HasValue)
            {
                return "⚠️ Yeh chat abhi branch se link nahi hai.\n\nKripya shuruwat se start karne ke liye *HI* likhkar bhejein. 🙏";
            }

            var activeToken = await _context.Tokens
                .Include(t => t.Queue)
                .ThenInclude(q => q.Doctor)
                .Where(t => t.Patient.Phone == session.PhoneNumber &&
                            t.Queue.BranchId == session.BranchId.Value &&
                            (t.Status == TokenStatus.Pending || t.Status == TokenStatus.Called))
                .OrderByDescending(t => t.BookedAt)
                .FirstOrDefaultAsync(ct);

            if (activeToken == null)
            {
                return "ℹ️ Aapka is branch me abhi koi appointment book nahi hai.\n\nNaya appointment lene ke liye *HI* likhkar bhejein. ✨";
            }

            if (activeToken.Status == TokenStatus.Called)
            {
                return $"🔔 *AAPKA NUMBER CHAL RAHA HAI!*\n\n*Dr. {activeToken.Queue.Doctor.Name}* ne aapka *Token #{activeToken.TokenNumber}* andar bulaya hai.\n\n👉 Kripya turant doctor ke cabin me aaiye. ✨";
            }

            var peopleAhead = await _context.Tokens
                .CountAsync(t => t.QueueId == activeToken.QueueId &&
                                 t.Status == TokenStatus.Pending &&
                                 t.TokenNumber < activeToken.TokenNumber, ct);

            return $"📊 *LIVE APPOINTMENT STATUS* 📊\n" +
                   $"━━━━━━━━━━━━━━━━━━━━━\n\n" +
                   $"👨‍⚕️ *Doctor:* Dr. {activeToken.Queue.Doctor.Name}\n" +
                   $"🔢 *Aapka Token:* #{activeToken.TokenNumber}\n" +
                   $"👥 *Aapke aage bache patients:* {peopleAhead}\n\n" +
                   $"⏱️ *Anumanit Samay:* Lagbhag {peopleAhead * 10} minutes.\n\n" +
                   $"💡 _Agar aap kisi wajah se nahi aa sakte, toh *CANCEL* likhkar bhejein._";
        }

        private async Task<string> HandleCancel(ChatSession session, CancellationToken ct)
        {
            if (!session.BranchId.HasValue)
            {
                return "⚠️ Yeh chat abhi branch se link nahi hai.\n\nKripya shuruwat se start karne ke liye *HI* likhkar bhejein. 🙏";
            }

            var activeToken = await _context.Tokens
                .Include(t => t.Queue)
                .Where(t => t.Patient.Phone == session.PhoneNumber &&
                            t.Queue.BranchId == session.BranchId.Value &&
                            t.Status == TokenStatus.Pending)
                .OrderByDescending(t => t.BookedAt)
                .FirstOrDefaultAsync(ct);

            if (activeToken == null)
            {
                return "⚠️ Radd (Cancel) karne ke liye aapka koi active appointment nahi mila. 🙏";
            }

            activeToken.Status = TokenStatus.Cancelled;
            await _context.SaveChangesAsync(ct);

            return "✅ Aapka appointment safaltapoorvak radd (Cancel) kar diya gaya hai. Swasth rahein! ✨";
        }

        private async Task<List<Doctor>> GetAvailableDoctors(Guid? branchId, CancellationToken ct)
        {
            if (!branchId.HasValue)
            {
                return new List<Doctor>();
            }

            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);
            int currentDayOfWeek = (int)today.DayOfWeek;

            var activeSessions = await _context.Sessions
                .Include(s => s.Doctor)
                .Where(s => s.BranchId == branchId.Value && s.IsActive && s.Doctor != null && s.Doctor.IsActive &&
                            (s.IsDaily || s.DayOfWeek == currentDayOfWeek))
                .ToListAsync(ct);

            var todayQueues = await _context.DailyQueues
                .Where(q => q.BranchId == branchId.Value && q.QueueDate >= today && q.QueueDate < tomorrow)
                .ToListAsync(ct);

            var availableDoctors = new List<Doctor>();
            foreach (var session in activeSessions)
            {
                var q = todayQueues.FirstOrDefault(x => x.SessionId == session.Id);
                if (q != null && (q.Status == QueueStatus.Completed || q.Status == QueueStatus.Cancelled))
                {
                    continue;
                }

                if (session.Doctor != null && !availableDoctors.Any(d => d.Id == session.Doctor.Id))
                {
                    availableDoctors.Add(session.Doctor);
                }
            }

            return availableDoctors.OrderBy(d => d.Name).ToList();
        }

        private async Task<List<Session>> GetAvailableSessions(Guid doctorId, Guid? branchId, CancellationToken ct)
        {
            if (!branchId.HasValue)
            {
                return new List<Session>();
            }

            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);
            int currentDayOfWeek = (int)today.DayOfWeek;

            var activeSessions = await _context.Sessions
                .Where(s => s.BranchId == branchId.Value && s.DoctorId == doctorId && s.IsActive &&
                            (s.IsDaily || s.DayOfWeek == currentDayOfWeek))
                .ToListAsync(ct);

            var todayQueues = await _context.DailyQueues
                .Where(q => q.BranchId == branchId.Value && q.DoctorId == doctorId && q.QueueDate >= today && q.QueueDate < tomorrow)
                .ToListAsync(ct);

            var availableSessions = new List<Session>();
            foreach (var session in activeSessions)
            {
                var q = todayQueues.FirstOrDefault(x => x.SessionId == session.Id);
                if (q != null && (q.Status == QueueStatus.Completed || q.Status == QueueStatus.Cancelled))
                {
                    continue;
                }

                availableSessions.Add(session);
            }

            return availableSessions.OrderBy(s => s.StartTime).ToList();
        }

        private static string NormalisePhone(string phoneNumber)
        {
            if (string.IsNullOrWhiteSpace(phoneNumber))
            {
                return string.Empty;
            }

            var trimmed = phoneNumber.Trim();
            if (trimmed.StartsWith("whatsapp:", StringComparison.OrdinalIgnoreCase))
            {
                trimmed = trimmed["whatsapp:".Length..];
            }

            if (trimmed.EndsWith("@c.us", StringComparison.OrdinalIgnoreCase))
            {
                trimmed = trimmed[..^"@c.us".Length];
            }

            var digits = new string(trimmed.Where(char.IsDigit).ToArray());
            if (digits.Length == 10)
            {
                digits = "91" + digits;
            }

            return "+" + digits;
        }
    }
}
