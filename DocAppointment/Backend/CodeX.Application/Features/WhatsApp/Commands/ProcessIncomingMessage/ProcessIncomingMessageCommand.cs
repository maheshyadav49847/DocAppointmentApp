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
            return "I did not understand that. Type 'HI' to see the main menu.";
        }

        private async Task<string> HandleConfirm(ChatSession session, string body, CancellationToken ct)
        {
            if (body != "confirm")
            {
                return "Please type 'CONFIRM' to book or 'HI' to restart.";
            }

            if (!session.SelectedDoctorId.HasValue || !session.SelectedSessionId.HasValue || !session.BranchId.HasValue)
            {
                ResetSession(session);
                return "Your selection expired. Type 'HI' to start again.";
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
                    q.QueueDate < tomorrow &&
                    q.Status != QueueStatus.Completed &&
                    q.Status != QueueStatus.Cancelled, ct);

            if (queue == null)
            {
                ResetSession(session);
                return "Sorry, the selected session is not active right now. Type 'HI' and try again.";
            }

            var patient = await _context.Patients.FirstOrDefaultAsync(p => p.Phone == session.PhoneNumber, ct);

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

            return $"Successfully booked.\n\nDoctor: Dr. {queue.Doctor?.Name}\nSession: {queue.Session?.SessionName}\nToken Number: #{tokenNum}\n\nType 'STATUS' anytime to check your position or 'CANCEL' to cancel.";
        }

        private async Task<string> HandleStart(ChatSession session, CancellationToken ct)
        {
            var patient = await _context.Patients.FirstOrDefaultAsync(p => p.Phone == session.PhoneNumber, ct);
            if (patient == null || string.IsNullOrWhiteSpace(patient.Name))
            {
                session.CurrentState = "AWAITING_NAME";
                return "Welcome to DocAppointment.\n\nIt looks like this is your first time. What is your full name?";
            }

            var doctors = await GetAvailableDoctors(session.BranchId, ct);
            if (!doctors.Any())
            {
                return "No doctors are available in this branch right now.";
            }

            var builder = new StringBuilder();
            builder.AppendLine($"Hello {patient.Name}! Please select a doctor to book an appointment:");
            builder.AppendLine();

            for (int i = 0; i < doctors.Count; i++)
            {
                builder.AppendLine($"{i + 1}. Dr. {doctors[i].Name} ({doctors[i].Specialization})");
            }

            builder.AppendLine();
            builder.Append("Or type 'STATUS' to check your current booking.");

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
                return "Invalid selection. Please reply with a number from the list.";
            }

            var doctors = await GetAvailableDoctors(session.BranchId, ct);
            if (index <= 0 || index > doctors.Count)
            {
                return "Invalid selection. Please reply with a number from the list.";
            }

            var selectedDoctor = doctors[index - 1];
            session.SelectedDoctorId = selectedDoctor.Id;

            var sessions = await GetAvailableSessions(selectedDoctor.Id, session.BranchId, ct);
            if (!sessions.Any())
            {
                ResetSession(session);
                return $"Sorry, Dr. {selectedDoctor.Name} has no active sessions today. Type 'HI' to select another doctor.";
            }

            var builder = new StringBuilder();
            builder.AppendLine($"You selected Dr. {selectedDoctor.Name}. Please select a session:");
            builder.AppendLine();

            for (int i = 0; i < sessions.Count; i++)
            {
                builder.AppendLine($"{i + 1}. {sessions[i].SessionName} ({sessions[i].StartTime:hh\\:mm} - {sessions[i].EndTime:hh\\:mm})");
            }

            session.CurrentState = "SELECT_SESSION";
            return builder.ToString();
        }

        private async Task<string> HandleSelectSession(ChatSession session, string body, CancellationToken ct)
        {
            if (!int.TryParse(body, out var index) || !session.SelectedDoctorId.HasValue)
            {
                return "Invalid selection. Please reply with a number from the list.";
            }

            var sessions = await GetAvailableSessions(session.SelectedDoctorId.Value, session.BranchId, ct);
            if (index <= 0 || index > sessions.Count)
            {
                return "Invalid selection. Please reply with a number from the list.";
            }

            var selectedSession = sessions[index - 1];
            session.SelectedSessionId = selectedSession.Id;

            var doctor = await _context.Doctors.FirstOrDefaultAsync(d => d.Id == session.SelectedDoctorId.Value, ct);
            session.CurrentState = "CONFIRM";

            return $"Doctor: {doctor?.Name}\nSession: {selectedSession.SessionName}\n\nType 'CONFIRM' to book your appointment.";
        }

        private async Task<string> HandleRatingScore(ChatSession session, string body, CancellationToken ct)
        {
            if (!int.TryParse(body, out var score) || score < 1 || score > 5 || !session.SelectedSessionId.HasValue)
            {
                return "Please reply with a valid number between 1 and 5.";
            }

            try
            {
                await _mediator.Send(new CreateRatingCommand
                {
                    TokenId = session.SelectedSessionId.Value,
                    Score = score
                }, ct);

                session.CurrentState = "AWAITING_RATING_COMMENT";
                return $"You rated us {score} out of 5.\n\nWould you like to leave a short comment? Reply 'Skip' to finish.";
            }
            catch (Exception ex)
            {
                ResetSession(session);
                return "Failed to save rating. " + ex.Message;
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
            return "Thank you for your feedback.";
        }

        private async Task<string> HandleStatus(ChatSession session, CancellationToken ct)
        {
            if (!session.BranchId.HasValue)
            {
                return "This chat is not linked to a branch yet. Type 'HI' to start again.";
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
                return "You do not have any active bookings in this branch. Type 'HI' to book one.";
            }

            if (activeToken.Status == TokenStatus.Called)
            {
                return $"Your turn is here.\n\nDr. {activeToken.Queue.Doctor.Name} is calling token #{activeToken.TokenNumber}. Please proceed to the cabin.";
            }

            var peopleAhead = await _context.Tokens
                .CountAsync(t => t.QueueId == activeToken.QueueId &&
                                 t.Status == TokenStatus.Pending &&
                                 t.TokenNumber < activeToken.TokenNumber, ct);

            return $"Booking Status:\n\nDoctor: Dr. {activeToken.Queue.Doctor.Name}\nToken: #{activeToken.TokenNumber}\nPatients ahead of you: {peopleAhead}\n\nEstimated wait: {peopleAhead * 10} minutes.\n\nType 'CANCEL' if you cannot make it.";
        }

        private async Task<string> HandleCancel(ChatSession session, CancellationToken ct)
        {
            if (!session.BranchId.HasValue)
            {
                return "This chat is not linked to a branch yet. Type 'HI' to start again.";
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
                return "No active pending booking found to cancel in this branch.";
            }

            activeToken.Status = TokenStatus.Cancelled;
            await _context.SaveChangesAsync(ct);

            return "Your booking has been cancelled.";
        }

        private async Task<List<Doctor>> GetAvailableDoctors(Guid? branchId, CancellationToken ct)
        {
            if (!branchId.HasValue)
            {
                return new List<Doctor>();
            }

            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);

            return await _context.DailyQueues
                .Where(q => q.BranchId == branchId.Value &&
                            q.QueueDate >= today &&
                            q.QueueDate < tomorrow &&
                            q.Status != QueueStatus.Completed &&
                            q.Status != QueueStatus.Cancelled)
                .Select(q => q.Doctor)
                .Distinct()
                .OrderBy(d => d.Name)
                .ToListAsync(ct);
        }

        private async Task<List<Session>> GetAvailableSessions(Guid doctorId, Guid? branchId, CancellationToken ct)
        {
            if (!branchId.HasValue)
            {
                return new List<Session>();
            }

            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);

            return await _context.DailyQueues
                .Where(q => q.BranchId == branchId.Value &&
                            q.DoctorId == doctorId &&
                            q.QueueDate >= today &&
                            q.QueueDate < tomorrow &&
                            q.Status != QueueStatus.Completed &&
                            q.Status != QueueStatus.Cancelled)
                .Select(q => q.Session)
                .Distinct()
                .OrderBy(s => s.StartTime)
                .ToListAsync(ct);
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
