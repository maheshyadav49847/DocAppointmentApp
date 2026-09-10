using CodeX.Application.Common.Helpers;
using CodeX.Application.Common.Interfaces;
using CodeX.Application.Features.WhatsApp.Commands.ProcessIncomingMessage;
using CodeX.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace CodeX.Api.Controllers
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/telegram/webhook")]
    public class TelegramWebhookController : ControllerBase
    {
        private readonly ILogger<TelegramWebhookController> _logger;
        private readonly ISender _mediator;
        private readonly ITelegramService _telegramService;
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public TelegramWebhookController(
            ILogger<TelegramWebhookController> logger,
            ISender mediator,
            ITelegramService telegramService,
            IApplicationDbContext context,
            ICurrentUserService currentUserService)
        {
            _logger = logger;
            _mediator = mediator;
            _telegramService = telegramService;
            _context = context;
            _currentUserService = currentUserService;
        }

        [AllowAnonymous]
        [HttpPost("{branchId}")]
        public async Task<IActionResult> ReceiveUpdate(Guid branchId, [FromBody] JsonElement payloadElement)
        {
            try
            {
                var payloadStr = payloadElement.GetRawText();
                var update = JsonSerializer.Deserialize<TelegramUpdate>(payloadStr, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (update?.Message == null) return Ok();

                var chatId = update.Message.Chat?.Id.ToString();
                if (string.IsNullOrEmpty(chatId)) return Ok();

                var branch = await _context.Branches
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(b => b.Id == branchId && !b.IsDeleted);

                if (branch == null) return Ok();

                // Set organization context
                _currentUserService.SetCurrentOrganization(branch.OrganizationId);

                var lang = NormalizeLanguage(update.Message.From?.LanguageCode);

                
                // Handle Telegram Web App Data (Form Submission)
                if (update.Message.WebAppData != null)
                {
                    var jsonData = update.Message.WebAppData.Data;
                    _logger.LogInformation($"Received Form Data: {jsonData}");

                    try 
                    {
                        var payload = JsonSerializer.Deserialize<Dictionary<string, string>>(jsonData);
                        if (payload != null && payload.ContainsKey("action") && payload["action"] == "book")
                        {
                            var queueIdStr = payload["queueId"];
                            if (Guid.TryParse(queueIdStr, out var qId))
                            {
                                var patient = await _context.Patients.FirstOrDefaultAsync(p => p.TelegramChatId == chatId && !p.IsDeleted);
                                if (patient != null)
                                {
                                    var queue = await _context.DailyQueues.Include(q => q.Doctor).FirstOrDefaultAsync(q => q.Id == qId);
                                    if (queue != null)
                                    {
                                        var tokenNumber = await _context.Tokens.CountAsync(t => t.QueueId == qId && !t.IsDeleted) + 1;
                                        var token = new CodeX.Domain.Entities.Token
                                        {
                                            QueueId = qId,
                                            PatientId = patient.Id,
                                            OrganizationId = branch.OrganizationId,
                                            TokenNumber = tokenNumber,
                                            Status = CodeX.Domain.Enums.TokenStatus.Pending,
                                            Source = CodeX.Domain.Enums.BookingSource.Telegram,
                                            BookedAt = DateTime.UtcNow
                                        };
                                        _context.Tokens.Add(token);
                                        await _context.SaveChangesAsync(default);

                                        var msg = $"✅ *Appointment Confirmed!*\n\nDoctor: {queue.Doctor?.Name}\nYour Token Number: *{tokenNumber}*\n\nPlease wait for your turn.";
                                        await _telegramService.SendTextMessage(chatId, msg, branchId);
                                        return Ok();
                                    }
                                }
                            }
                        }
                    }
                    catch(Exception ex)
                    {
                        _logger.LogError(ex, "Error booking token from webapp");
                    }

                    await _telegramService.SendTextMessage(chatId, "Booking processed successfully!", branchId);
                    return Ok();
                }

                // Handle Contact Share
                if (update.Message.Contact != null)
                {
                    await HandleContactReceived(branchId, branch.OrganizationId, chatId, update.Message.Contact, lang);
                    return Ok();
                }

                // Handle Text Message
                if (!string.IsNullOrWhiteSpace(update.Message.Text))
                {
                    await HandleTextMessage(branchId, chatId, update.Message.Text, lang);
                }

                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing Telegram Webhook");
                return Ok();
            }
        }

        private async Task HandleContactReceived(Guid branchId, Guid orgId, string chatId, TelegramContact contact, string lang)
        {
            var phone = NormalizationHelper.NormalizePhone(contact.PhoneNumber);

            // Find existing patient by phone
            var phoneVars = NormalizationHelper.GetPhoneVariations(phone);
            var patient = await _context.Patients
                .FirstOrDefaultAsync(p => !p.IsDeleted && phoneVars.Contains(p.Phone));

            if (patient == null)
            {
                patient = new Patient
                {
                    Phone = phone,
                    Name = contact.FirstName ?? "Unknown",
                    TelegramChatId = chatId,
                    OrganizationId = orgId
                };
                _context.Patients.Add(patient);
            }
            else
            {
                // Update all matching patients to have this Telegram Chat ID (in case of family profiles)
                var patients = await _context.Patients
                    .Where(p => !p.IsDeleted && phoneVars.Contains(p.Phone))
                    .ToListAsync();
                foreach (var p in patients)
                {
                    p.TelegramChatId = chatId;
                }
            }

            await _context.SaveChangesAsync(default);

            string contactLang = "hi";
            if (!string.IsNullOrEmpty(patient.MetaDataJson))
            {
                try
                {
                    using var doc = JsonDocument.Parse(patient.MetaDataJson);
                    if (doc.RootElement.TryGetProperty("language", out var lProp))
                    {
                        var s = lProp.GetString();
                        if (!string.IsNullOrEmpty(s)) contactLang = NormalizeLanguage(s);
                    }
                }
                catch { }
            }
            else
            {
                // Check if patient's phone has a ChatSession
                var chatSession = await _context.ChatSessions.FirstOrDefaultAsync(s => s.PhoneNumber == patient.Phone);
                if (chatSession != null && !string.IsNullOrEmpty(chatSession.Language))
                    contactLang = NormalizeLanguage(chatSession.Language);
                else
                    contactLang = NormalizeLanguage(lang);
            }

            // Force Form on Contact Share instead of old AI
            await SendWebAppButton(branchId, chatId, contactLang);
        }

        private static string NormalizeLanguage(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return "hi";
            var lower = raw.Trim().ToLowerInvariant();
            if (lower == "1" || lower.StartsWith("hi") || lower.Contains("हिन्दी") || lower.Contains("हिंदी")) return "hi";
            if (lower == "2" || lower.StartsWith("mr") || lower.Contains("मराठी")) return "mr";
            if (lower == "3" || lower.StartsWith("en") || lower.Contains("english")) return "en";
            return "hi"; // Default to Hindi
        }

        private async Task HandleTextMessage(Guid branchId, string chatId, string text, string rawLang)
        {
            var cleanText = text.Trim();

            // Look up patient by Telegram Chat ID
            var patient = await _context.Patients
                .FirstOrDefaultAsync(p => !p.IsDeleted && p.TelegramChatId == chatId);

            // Determine current language: from patient preferences or ChatSession or incoming rawLang
            string lang = NormalizeLanguage(rawLang);
            if (patient != null && !string.IsNullOrEmpty(patient.MetaDataJson))
            {
                try
                {
                    using var doc = JsonDocument.Parse(patient.MetaDataJson);
                    if (doc.RootElement.TryGetProperty("language", out var lProp))
                    {
                        var saved = lProp.GetString();
                        if (!string.IsNullOrEmpty(saved)) lang = NormalizeLanguage(saved);
                    }
                }
                catch { }
            }
            else if (patient != null && !string.IsNullOrEmpty(patient.Phone))
            {
                var chatSession = await _context.ChatSessions.FirstOrDefaultAsync(s => s.PhoneNumber == patient.Phone);
                if (chatSession != null && !string.IsNullOrEmpty(chatSession.Language))
                    lang = NormalizeLanguage(chatSession.Language);
            }

            // Language switch command or 1/2/3
            if (cleanText == "1" || cleanText.Equals("hindi", StringComparison.OrdinalIgnoreCase) || cleanText.Equals("हिन्दी", StringComparison.OrdinalIgnoreCase))
            {
                lang = "hi";
                await SavePatientLanguage(patient, lang);
                await _telegramService.SendTextMessage(chatId, "✅ भाषा *हिन्दी* चुन ली गई है।", branchId);
                // Proceed to next step below
            }
            else if (cleanText == "2" || cleanText.Equals("marathi", StringComparison.OrdinalIgnoreCase) || cleanText.Equals("मराठी", StringComparison.OrdinalIgnoreCase))
            {
                lang = "mr";
                await SavePatientLanguage(patient, lang);
                await _telegramService.SendTextMessage(chatId, "✅ भाषा *मराठी* निवडली आहे.", branchId);
            }
            else if (cleanText == "3" || cleanText.Equals("english", StringComparison.OrdinalIgnoreCase))
            {
                lang = "en";
                await SavePatientLanguage(patient, lang);
                await _telegramService.SendTextMessage(chatId, "✅ Language set to *English*.", branchId);
            }
            else if (cleanText.Equals("/language", StringComparison.OrdinalIgnoreCase) || cleanText.Equals("/lang", StringComparison.OrdinalIgnoreCase))
            {
                var langPrompt = "🌐 कृपया भाषा चुनें / Please choose language:\n\n1️⃣ हिन्दी (Reply 1)\n2️⃣ मराठी (Reply 2)\n3️⃣ English (Reply 3)";
                await _telegramService.SendTextMessage(chatId, langPrompt, branchId);
                return;
            }

            if (cleanText.Equals("/form", StringComparison.OrdinalIgnoreCase))
            {
                // /form always opens form (admin override)
                await SendWebAppButton(branchId, chatId, lang);
                return;
            }

            if (cleanText.Equals("/start", StringComparison.OrdinalIgnoreCase))
            {
                if (patient == null || string.IsNullOrWhiteSpace(patient.Phone))
                {
                    await RequestContact(branchId, chatId);
                    return;
                }
            }

            if (patient == null || string.IsNullOrWhiteSpace(patient.Phone))
            {
                await RequestContact(branchId, chatId);
                return;
            }

            // Scenario 2: Check if patient already has an active token for today
            var existingToken = await GetExistingActiveToken(branchId, patient.Id);
            if (existingToken != null)
            {
                await SendExistingBookingDetails(branchId, chatId, existingToken, lang);
                return;
            }

            // No active booking — show booking form
            await SendWebAppButton(branchId, chatId, lang);
        }

        private async Task SavePatientLanguage(Patient? patient, string lang)
        {
            if (patient == null) return;
            try
            {
                var dict = new Dictionary<string, string>();
                if (!string.IsNullOrEmpty(patient.MetaDataJson))
                {
                    try { dict = JsonSerializer.Deserialize<Dictionary<string, string>>(patient.MetaDataJson) ?? new(); } catch { }
                }
                dict["language"] = lang;
                patient.MetaDataJson = JsonSerializer.Serialize(dict);
                await _context.SaveChangesAsync(default);
            }
            catch { }
        }

        private async Task<object?> GetExistingActiveToken(Guid branchId, Guid patientId)
        {
            var branch = await _context.Branches
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(b => b.Id == branchId && !b.IsDeleted);
            if (branch == null) return null;

            var today = CodeX.Application.Common.Helpers.TimeHelper.GetBranchLocalToday(branch.Timezone);
            var tomorrow = today.AddDays(1);

            var activeToken = await _context.Tokens
                .IgnoreQueryFilters()
                .Include(t => t.Queue)
                    .ThenInclude(q => q.Doctor)
                .Include(t => t.Queue)
                    .ThenInclude(q => q.Session)
                .Where(t => t.PatientId == patientId
                    && !t.IsDeleted
                    && t.Queue.BranchId == branchId
                    && t.Queue.QueueDate >= today
                    && t.Queue.QueueDate < tomorrow
                    && (t.Status == Domain.Enums.TokenStatus.Pending || t.Status == Domain.Enums.TokenStatus.Called))
                .Select(t => new {
                    t.TokenNumber,
                    DoctorName = t.Queue.Doctor.Name,
                    SessionName = t.Queue.Session != null ? t.Queue.Session.SessionName : "",
                    t.Queue.CurrentTokenNumber,
                    t.Status
                })
                .FirstOrDefaultAsync();

            return activeToken;
        }

        private async Task SendExistingBookingDetails(Guid branchId, string chatId, dynamic booking, string lang)
        {
            var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == branchId);
            var botToken = branch?.TelegramBotToken;
            if (string.IsNullOrWhiteSpace(botToken)) return;

            string msg;
            if (lang == "mr")
            {
                msg = $"✅ *तुमची बुकिंग आधीच अस्तित्वात आहे!*\n\n"
                    + $"🩺 डॉक्टर: *{booking.DoctorName}*\n"
                    + $"🎫 तुमचा टोकन नंबर: *{booking.TokenNumber}*\n"
                    + $"📍 सध्याचा चालू टोकन: *{booking.CurrentTokenNumber}*\n"
                    + (booking.SessionName != "" ? $"🕐 सत्र: {booking.SessionName}\n" : "")
                    + $"\nकृपया क्लिनिकमध्ये येऊन आपल्या पाळीची वाट पहा. 🙏";
            }
            else if (lang == "hi")
            {
                msg = $"✅ *आपकी बुकिंग पहले से मौजूद है!*\n\n"
                    + $"🩺 डॉक्टर: *{booking.DoctorName}*\n"
                    + $"🎫 आपका टोकन नंबर: *{booking.TokenNumber}*\n"
                    + $"📍 वर्तमान टोकन: *{booking.CurrentTokenNumber}*\n"
                    + (booking.SessionName != "" ? $"🕐 सत्र: {booking.SessionName}\n" : "")
                    + $"\nकृपया क्लिनिक पर आकर अपनी बारी का इंतज़ार करें। 🙏";
            }
            else
            {
                msg = $"✅ *You already have an active booking!*\n\n"
                    + $"🩺 Doctor: *{booking.DoctorName}*\n"
                    + $"🎫 Your Token: *{booking.TokenNumber}*\n"
                    + $"📍 Current Token: *{booking.CurrentTokenNumber}*\n"
                    + (booking.SessionName != "" ? $"🕐 Session: {booking.SessionName}\n" : "")
                    + $"\nPlease visit the clinic and wait for your turn. 🙏";
            }

            var payload = new
            {
                chat_id = chatId,
                text = msg,
                parse_mode = "Markdown"
            };

            var url = $"https://api.telegram.org/bot{botToken}/sendMessage";
            var json = JsonSerializer.Serialize(payload);
            var content = new System.Net.Http.StringContent(json, System.Text.Encoding.UTF8, "application/json");
            var client = new System.Net.Http.HttpClient();
            await client.PostAsync(url, content);
        }

        
        private async Task SendWebAppButton(Guid branchId, string chatId, string lang)
        {
            var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == branchId);
            var token = branch?.TelegramBotToken;
            if (string.IsNullOrWhiteSpace(token)) return;

            // Using Ngrok or your deployed frontend URL
            var host = Request.Headers["X-Forwarded-Host"].FirstOrDefault() ?? Request.Host.Value;
            var webAppUrl = $"https://{host}/telegram-form?branchId={branchId}&chatId={chatId}&lang={lang}&v={DateTime.UtcNow.Ticks}";

            string promptText = lang switch
            {
                "mr" => "📅 अपॉइंटमेंट बुक करण्यासाठी खालील बटनावर क्लिक करा:",
                "hi" => "📅 अपॉइंटमेंट बुक करने के लिए नीचे बटन पर क्लिक करें:",
                _ => "📅 Click the button below to book an appointment:"
            };

            string btnText = lang switch
            {
                "mr" => "📅 अपॉइंटमेंट बुक करा",
                "hi" => "📅 अपॉइंटमेंट बुक करें",
                _ => "📅 Book Appointment"
            };

            var payload = new
            {
                chat_id = chatId,
                text = promptText,
                reply_markup = new
                {
                    inline_keyboard = new[]
                    {
                        new[]
                        {
                            new { text = btnText, web_app = new { url = webAppUrl } }
                        }
                    },
                    
                }
            };

            var url = $"https://api.telegram.org/bot{token}/sendMessage";
            var json = JsonSerializer.Serialize(payload);
            var content = new System.Net.Http.StringContent(json, System.Text.Encoding.UTF8, "application/json");

            var client = new System.Net.Http.HttpClient();
            await client.PostAsync(url, content);
        }

        private async Task RequestContact(Guid branchId, string chatId)
        {
            var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == branchId);
            var token = branch?.TelegramBotToken;
            if (string.IsNullOrWhiteSpace(token)) return;

            var payload = new
            {
                chat_id = chatId,
                text = "Welcome! To book an appointment, please share your phone number with us by tapping the button below.",
                reply_markup = new
                {
                    keyboard = new[]
                    {
                        new[]
                        {
                            new { text = "📱 Share Phone Number", request_contact = true }
                        }
                    },
                    resize_keyboard = true,
                    one_time_keyboard = true
                }
            };

            var url = $"https://api.telegram.org/bot{token}/sendMessage";
            var json = JsonSerializer.Serialize(payload);
            var content = new System.Net.Http.StringContent(json, System.Text.Encoding.UTF8, "application/json");

            var client = new System.Net.Http.HttpClient();
            await client.PostAsync(url, content);
        }
    }

    // Telegram Models
    public class TelegramUpdate
    {
        [JsonPropertyName("update_id")]
        public long UpdateId { get; set; }
        public TelegramMessage? Message { get; set; }
    }

    public class TelegramMessage
    {
        [JsonPropertyName("message_id")]
        public long MessageId { get; set; }
        public TelegramChat? Chat { get; set; }
        public TelegramUser? From { get; set; }
        public string? Text { get; set; }
        public TelegramContact? Contact { get; set; }
        [JsonPropertyName("web_app_data")]
        public TelegramWebAppData? WebAppData { get; set; }
    }

    public class TelegramUser
    {
        public long Id { get; set; }
        [JsonPropertyName("first_name")]
        public string? FirstName { get; set; }
        [JsonPropertyName("language_code")]
        public string? LanguageCode { get; set; }
    }

    public class TelegramChat
    {
        public long Id { get; set; }
        public string? Type { get; set; }
    }

    
    public class TelegramWebAppData
    {
        [JsonPropertyName("data")]
        public string Data { get; set; } = string.Empty;
        [JsonPropertyName("button_text")]
        public string? ButtonText { get; set; }
    }

    public class TelegramContact
    {
        [JsonPropertyName("phone_number")]
        public string PhoneNumber { get; set; } = string.Empty;
        [JsonPropertyName("first_name")]
        public string? FirstName { get; set; }
        [JsonPropertyName("last_name")]
        public string? LastName { get; set; }
        [JsonPropertyName("user_id")]
        public long? UserId { get; set; }
    }
}






