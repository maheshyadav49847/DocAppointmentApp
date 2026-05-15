using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using System.Security.Cryptography;

namespace CodeX.Application.Features.Auth.Commands.ForgotPassword
{
    public record ForgotPasswordCommand : IRequest<bool>
    {
        public string Identifier { get; init; } = string.Empty; // Can be Email or Phone
        public string Method { get; init; } = "Email"; // "Email" or "Phone"
    }

    public class ForgotPasswordCommandHandler : IRequestHandler<ForgotPasswordCommand, bool>
    {
        private readonly IApplicationDbContext _context;
        private readonly IWhatsAppService _whatsApp;
        private readonly IEmailService _email;
        private readonly ISmsService _sms;

        public ForgotPasswordCommandHandler(IApplicationDbContext context, IWhatsAppService whatsApp, IEmailService email, ISmsService sms)
        {
            _context = context;
            _whatsApp = whatsApp;
            _email = email;
            _sms = sms;
        }

        public async Task<bool> Handle(ForgotPasswordCommand request, CancellationToken cancellationToken)
        {
            var isEmail = request.Identifier.Contains("@");
            var normalizedIdentifier = isEmail ? 
                CodeX.Application.Common.Helpers.NormalizationHelper.NormalizeEmail(request.Identifier) : 
                CodeX.Application.Common.Helpers.NormalizationHelper.NormalizePhone(request.Identifier);

            var staff = await _context.Staffs
                .FirstOrDefaultAsync(x => x.Email == normalizedIdentifier || x.PhoneNumber == normalizedIdentifier, cancellationToken);

            if (staff == null)
            {
                return true;
            }

            var otp = RandomNumberGenerator.GetInt32(100000, 999999).ToString();
            staff.PasswordResetToken = otp;
            staff.ResetTokenExpiry = DateTime.UtcNow.AddMinutes(15);

            await _context.SaveChangesAsync(cancellationToken);

            var message = $"Your password reset OTP is: {otp}. Valid for 15 minutes.";
            Console.WriteLine($"[OTP DEBUG] Method: {request.Method}, ID: *** - OTP Generated and Sent.");

            if (request.Method == "Email")
            {
                await _email.SendEmailAsync(staff.Email, "Password Reset OTP", message);
            }
            else if (request.Method == "Phone")
            {
                if (!string.IsNullOrWhiteSpace(staff.PhoneNumber))
                {
                    // Try WhatsApp
                    try
                    {
                        await _whatsApp.SendTextMessage(staff.PhoneNumber, message, staff.BranchId ?? Guid.Empty);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[DEBUG] WhatsApp delivery failed but continuing to SMS: {ex.Message}");
                    }

                    // Try SMS
                    try
                    {
                        await _sms.SendSmsAsync(staff.PhoneNumber, message);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[DEBUG] SMS delivery failed: {ex.Message}");
                    }
                }
            }

            return true;
        }
    }
}
