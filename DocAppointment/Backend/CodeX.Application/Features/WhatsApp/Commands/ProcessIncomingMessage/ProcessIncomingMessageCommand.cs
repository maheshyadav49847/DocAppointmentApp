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
                .FirstOrDefaultAsync(x => x.PhoneNumber == fromPhone, cancellationToken);

            if (session == null)
            {
                session = new ChatSession { PhoneNumber = fromPhone, CurrentState = "START" };
                _context.ChatSessions.Add(session);
            }

            string response;
            var body = request.MessageBody.Trim();
            var bodyLower = body.ToLowerInvariant();

            if (bodyLower is "hi" or "reset" or "start" or "menu")
            {
                session.CurrentState = "START";
            }
            else if (bodyLower is "status" or "check")
            {
                return await HandleStatus(session, cancellationToken);
            }
            else if (bodyLower == "cancel")
            {
                return await HandleCancel(session, cancellationToken);
            }

            response = session.CurrentState switch
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

        private static string HandleUnknown(ChatSession session)
        {
            session.CurrentState = "START";
            return "I didn't understand that. Type 'Hi' to see the main menu.";
        }

        private async Task<string> HandleConfirm(ChatSession session, string body, CancellationToken ct)
        {
            if (body != "confirm")
            {
                return "Please type 'CONFIRM' to book or 'HI' to restart.";
            }

            var today = DateTime.UtcNow.Date;
            var queue = await _context.DailyQueues
                .FirstOrDefaultAsync(q =>
                    q.DoctorId == session.SelectedDoctorId &&
                    q.SessionId == session.SelectedSessionId &&
                    q.QueueDate.Date == today &&
                    q.Status != QueueStatus.Completed &&
                    q.Status != QueueStatus.Cancelled, ct);

            if (queue == null)
            {
                return "Sorry, the selected session is not active right now. Please type 'HI' and try again.";
            }

            var patient = await _context.Patients.FirstOrDefaultAsync(p => p.Phone == session.PhoneNumber, ct);

            await _mediator.Send(new CreateTokenCommand
            {
                QueueId = queue.Id,
                PatientName = patient?.Name ?? "WhatsApp User",
                PatientPhone = session.PhoneNumber,
                Source = BookingSource.WhatsApp
            }, ct);

            session.CurrentState = "START";
            session.SelectedDoctorId = null;
            session.SelectedSessionId = null;

            return "Successfully booked. You will receive your token number shortly on WhatsApp. Type 'STATUS' anytime to check your position.";
        }

        private async Task<string> HandleStart(ChatSession session, CancellationToken ct)
        {
            var patient = await _context.Patients.FirstOrDefaultAsync(p => p.Phone == session.PhoneNumber, ct);
            if (patient == null || string.IsNullOrWhiteSpace(patient.Name))
            {
                session.CurrentState = "AWAITING_NAME";
                return "Welcome to DocAppointment.\n\nIt looks like this is your first time. What is your full name?";
            }

            var doctors = await GetAvailableDoctors(ct);
            if (!doctors.Any())
            {
                return "No doctors available at the moment.";
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
                patient = new Patient { Phone = session.PhoneNumber, Name = name };
                _context.Patients.Add(patient);
            }
            else
            {
                patient.Name = name;
            }

            await _context.SaveChangesAsync(ct);
            return await HandleStart(session, ct);
        }

        private async Task<string> HandleSelectDoctor(ChatSession session, string body, CancellationToken ct)
        {
            if (!int.TryParse(body, out int index))
            {
                return "Invalid selection. Please reply with a number from the list.";
            }

            var doctors = await GetAvailableDoctors(ct);
            if (index <= 0 || index > doctors.Count)
            {
                return "Invalid selection. Please reply with a number from the list.";
            }

            var selectedDoctor = doctors[index - 1];
            session.SelectedDoctorId = selectedDoctor.Id;

            var sessions = await GetAvailableSessions(selectedDoctor.Id, ct);
            if (!sessions.Any())
            {
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
            if (!int.TryParse(body, out int index) || !session.SelectedDoctorId.HasValue)
            {
                return "Invalid selection. Please reply with a number from the list.";
            }

            var sessions = await GetAvailableSessions(session.SelectedDoctorId.Value, ct);
            if (index <= 0 || index > sessions.Count)
            {
                return "Invalid selection. Please reply with a number from the list.";
            }

            var selectedSession = sessions[index - 1];
            session.SelectedSessionId = selectedSession.Id;

            var doctor = await _context.Doctors.FindAsync([session.SelectedDoctorId.Value], ct);
            session.CurrentState = "CONFIRM";

            return $"Doctor: {doctor?.Name}\nSession: {selectedSession.SessionName}\n\nType 'CONFIRM' to book your appointment.";
        }

        private async Task<string> HandleRatingScore(ChatSession session, string body, CancellationToken ct)
        {
            if (!int.TryParse(body, out int score) || score < 1 || score > 5 || !session.SelectedSessionId.HasValue)
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
                return $"You rated us {score} out of 5 stars.\n\nWould you like to leave a short text comment about your experience? (Or reply 'Skip' to finish)";
            }
            catch (Exception ex)
            {
                session.CurrentState = "START";
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

            session.CurrentState = "START";
            session.SelectedSessionId = null;
            return "Thank you for your valuable feedback! Have a great day.";
        }

        private async Task<string> HandleStatus(ChatSession session, CancellationToken ct)
        {
            var activeToken = await _context.Tokens
                .Include(t => t.Queue)
                .ThenInclude(q => q.Doctor)
                .Where(t => t.Patient.Phone == session.PhoneNumber && (t.Status == TokenStatus.Pending || t.Status == TokenStatus.Called))
                .OrderByDescending(t => t.BookedAt)
                .FirstOrDefaultAsync(ct);

            if (activeToken == null)
            {
                return "You don't have any active bookings. Type 'HI' to book one.";
            }

            if (activeToken.Status == TokenStatus.Called)
            {
                return $"YOUR TURN IS HERE.\n\nDr. {activeToken.Queue.Doctor.Name} is calling for Token #{activeToken.TokenNumber}. Please proceed to the cabin.";
            }

            var peopleAhead = await _context.Tokens
                .CountAsync(t => t.QueueId == activeToken.QueueId && t.Status == TokenStatus.Pending && t.TokenNumber < activeToken.TokenNumber, ct);

            return $"Booking Status:\n\nDoctor: Dr. {activeToken.Queue.Doctor.Name}\nToken: #{activeToken.TokenNumber}\nPatients ahead of you: {peopleAhead}\n\nEstimated wait: {peopleAhead * 10} minutes.\n\nType 'CANCEL' if you can't make it.";
        }

        private async Task<string> HandleCancel(ChatSession session, CancellationToken ct)
        {
            var activeToken = await _context.Tokens
                .Where(t => t.Patient.Phone == session.PhoneNumber && t.Status == TokenStatus.Pending)
                .OrderByDescending(t => t.BookedAt)
                .FirstOrDefaultAsync(ct);

            if (activeToken == null)
            {
                return "No active pending booking found to cancel.";
            }

            activeToken.Status = TokenStatus.Cancelled;
            await _context.SaveChangesAsync(ct);

            return "Your booking has been cancelled. We hope to see you again soon.";
        }

        private async Task<List<Doctor>> GetAvailableDoctors(CancellationToken ct)
        {
            var today = DateTime.UtcNow.Date;
            return await _context.DailyQueues
                .Where(q => q.QueueDate.Date == today && q.Status != QueueStatus.Completed && q.Status != QueueStatus.Cancelled)
                .Select(q => q.Doctor)
                .Distinct()
                .OrderBy(d => d.Name)
                .ToListAsync(ct);
        }

        private async Task<List<Session>> GetAvailableSessions(Guid doctorId, CancellationToken ct)
        {
            var today = DateTime.UtcNow.Date;
            return await _context.DailyQueues
                .Where(q => q.QueueDate.Date == today &&
                            q.DoctorId == doctorId &&
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

            var digits = new StringBuilder();
            foreach (var ch in trimmed)
            {
                if (char.IsDigit(ch))
                {
                    digits.Append(ch);
                }
            }

            return digits.Length == 0 ? trimmed : $"+{digits}";
        }
    }
}
