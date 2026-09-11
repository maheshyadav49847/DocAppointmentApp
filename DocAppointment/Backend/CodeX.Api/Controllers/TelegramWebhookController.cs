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

                var branch = await _context.Branches
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(b => b.Id == branchId && !b.IsDeleted);

                if (branch == null) return Ok();

                // Set organization context
                _currentUserService.SetCurrentOrganization(branch.OrganizationId);

                // Handle Callback Queries (Inline Button clicks)
                if (update?.CallbackQuery != null)
                {
                    await HandleCallbackQuery(branchId, branch.OrganizationId, update.CallbackQuery);
                    return Ok();
                }

                if (update?.Message == null) return Ok();

                var chatId = update.Message.Chat?.Id.ToString();
                if (string.IsNullOrEmpty(chatId)) return Ok();

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

                                        string confirmMsg;
                                        if (lang == "mr")
                                            confirmMsg = $"✅ *अपॉइंटमेंट निश्चित झाली!*\n\nडॉक्टर: {queue.Doctor?.Name}\nतुमचा टोकन नंबर: *{tokenNumber}*\n\nकृपया आपल्या पाळीची वाट पहा. 🙏";
                                        else if (lang == "hi")
                                            confirmMsg = $"✅ *अपॉइंटमेंट पक्की हो गई!*\n\nडॉक्टर: {queue.Doctor?.Name}\nआपका टोकन नंबर: *{tokenNumber}*\n\nकृपया अपनी बारी का इंतज़ार करें। 🙏";
                                        else
                                            confirmMsg = $"✅ *Appointment Confirmed!*\n\nDoctor: {queue.Doctor?.Name}\nYour Token Number: *{tokenNumber}*\n\nPlease wait for your turn. 🙏";

                                        await _telegramService.SendTextMessage(chatId, confirmMsg, branchId);
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

                    string successNotice = lang switch
                    {
                        "mr" => "बुकिंग प्रक्रिया पूर्ण झाली!",
                        "hi" => "बुकिंग प्रक्रिया पूरी हुई!",
                        _ => "Booking processed successfully!"
                    };
                    await _telegramService.SendTextMessage(chatId, successNotice, branchId);
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
            var branch = await _context.Branches
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(b => b.Id == branchId && !b.IsDeleted);

            ChatSession? chatSession = null;
            if (patient != null && !string.IsNullOrEmpty(patient.Phone))
            {
                var phoneVars = NormalizationHelper.GetPhoneVariations(patient.Phone);
                var normalizedPhone = NormalizationHelper.NormalizePhone(patient.Phone);
                chatSession = await _context.ChatSessions
                    .FirstOrDefaultAsync(s => (phoneVars.Contains(s.PhoneNumber) || s.PhoneNumber == normalizedPhone) && s.BranchId == branchId && !s.IsDeleted);
                if (chatSession != null && !string.IsNullOrEmpty(chatSession.Language))
                    lang = NormalizeLanguage(chatSession.Language);
            }
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

            // ─── 1. Rating & Feedback Handling ──────────────────────────────────────────
            var timezone = branch?.Timezone ?? "India Standard Time";
            var today = CodeX.Application.Common.Helpers.TimeHelper.GetBranchLocalToday(timezone);
            var tomorrow = today.AddDays(1);

            Domain.Entities.Token? unratedCompletedToken = null;
            if (patient != null)
            {
                unratedCompletedToken = await _context.Tokens
                    .IgnoreQueryFilters()
                    .Include(t => t.Queue)
                    .Where(t => t.PatientId == patient.Id
                        && !t.IsDeleted
                        && t.Queue.BranchId == branchId
                        && t.Queue.QueueDate >= today
                        && t.Queue.QueueDate < tomorrow
                        && t.Status == Domain.Enums.TokenStatus.Completed
                        && !_context.Ratings.IgnoreQueryFilters().Any(r => !r.IsDeleted && r.TokenId == t.Id))
                    .OrderByDescending(t => t.CalledAt ?? t.BookedAt)
                    .FirstOrDefaultAsync();
            }

            bool isAwaitingRatingComment = chatSession != null && chatSession.CurrentState == "AWAITING_RATING_COMMENT";
            bool isAwaitingRatingScore = (chatSession != null && chatSession.CurrentState == "AWAITING_RATING_SCORE") || unratedCompletedToken != null;

            if (isAwaitingRatingComment)
            {
                var isSkip = cleanText.Equals("skip", StringComparison.OrdinalIgnoreCase)
                          || cleanText.Equals("छोड़ें", StringComparison.OrdinalIgnoreCase)
                          || cleanText.Equals("सोडा", StringComparison.OrdinalIgnoreCase);

                if (!isSkip && chatSession!.SelectedSessionId.HasValue)
                {
                    var rating = await _context.Ratings.IgnoreQueryFilters()
                        .FirstOrDefaultAsync(r => !r.IsDeleted && r.TokenId == chatSession.SelectedSessionId.Value);
                    if (rating != null)
                    {
                        rating.Comment = cleanText;
                    }
                }

                chatSession!.CurrentState = "START";
                chatSession.SelectedSessionId = null;
                await _context.SaveChangesAsync(default);

                var feedbackSuccessMsg = CodeX.Application.Common.Helpers.WhatsAppTranslationHelper.Get(lang, "FEEDBACK_SUCCESS");
                await _telegramService.SendTextMessage(chatId, feedbackSuccessMsg, branchId);
                return;
            }

            if (isAwaitingRatingScore)
            {
                int score = 0;
                if (cleanText == "1" || cleanText.StartsWith("1️⃣") || cleanText.StartsWith("1/5") || cleanText.StartsWith("1 star", StringComparison.OrdinalIgnoreCase)) score = 1;
                else if (cleanText == "2" || cleanText.StartsWith("2️⃣") || cleanText.StartsWith("2/5") || cleanText.StartsWith("2 star", StringComparison.OrdinalIgnoreCase)) score = 2;
                else if (cleanText == "3" || cleanText.StartsWith("3️⃣") || cleanText.StartsWith("3/5") || cleanText.StartsWith("3 star", StringComparison.OrdinalIgnoreCase)) score = 3;
                else if (cleanText == "4" || cleanText.StartsWith("4️⃣") || cleanText.StartsWith("4/5") || cleanText.StartsWith("4 star", StringComparison.OrdinalIgnoreCase)) score = 4;
                else if (cleanText == "5" || cleanText.StartsWith("5️⃣") || cleanText.StartsWith("5/5") || cleanText.StartsWith("5 star", StringComparison.OrdinalIgnoreCase)) score = 5;

                if (score > 0)
                {
                    var targetTokenId = chatSession?.SelectedSessionId ?? unratedCompletedToken?.Id;
                    if (targetTokenId.HasValue)
                    {
                        try
                        {
                            await _mediator.Send(new CodeX.Application.Features.Ratings.Commands.CreateRating.CreateRatingCommand
                            {
                                TokenId = targetTokenId.Value,
                                Score = score
                            });

                            if (chatSession == null && patient != null && !string.IsNullOrEmpty(patient.Phone))
                            {
                                chatSession = new ChatSession
                                {
                                    PhoneNumber = CodeX.Application.Common.Helpers.NormalizationHelper.NormalizePhone(patient.Phone),
                                    BranchId = branchId,
                                };
                                _context.ChatSessions.Add(chatSession);
                            }

                            if (chatSession != null)
                            {
                                chatSession.CurrentState = "AWAITING_RATING_COMMENT";
                                chatSession.SelectedSessionId = targetTokenId.Value;
                                await _context.SaveChangesAsync(default);
                            }

                            var commentPrompt = CodeX.Application.Common.Helpers.WhatsAppTranslationHelper.Get(lang, "COMMENT_PROMPT");
                            await _telegramService.SendTextMessage(chatId, commentPrompt, branchId);
                            return;
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Error submitting rating from Telegram");
                        }
                    }
                }
                else if (chatSession != null && chatSession.CurrentState == "AWAITING_RATING_SCORE")
                {
                    var ratingPrompt = CodeX.Application.Common.Helpers.WhatsAppTranslationHelper.Get(lang, "RATING_PROMPT");
                    await _telegramService.SendTextMessage(chatId, ratingPrompt, branchId);
                    return;
                }
            }

            // ─── 2. Courtesy Acknowledgements ────────────────────────────────────
            if (cleanText.Equals("thanks", StringComparison.OrdinalIgnoreCase) 
                || cleanText.Equals("thank you", StringComparison.OrdinalIgnoreCase) 
                || cleanText.Equals("धन्यवाद", StringComparison.OrdinalIgnoreCase)
                || cleanText.Equals("आभार", StringComparison.OrdinalIgnoreCase)
                || cleanText.Equals("thx", StringComparison.OrdinalIgnoreCase))
            {
                string thanksReply = lang switch
                {
                    "mr" => "🙏 आपले खूप खूप आभार! निरोगी रहा, सुरक्षित रहा. नवीन अपॉइंटमेंटसाठी कधीही *HI* लिहून पाठवा. 😊",
                    "hi" => "🙏 आपका बहुत-बहुत धन्यवाद! स्वस्थ रहें, सुरक्षित रहें। नई अपॉइंटमेंट के लिए कभी भी *HI* लिखकर भेजें। 😊",
                    _ => "🙏 Thank you very much! Stay healthy and safe. To book a new appointment, reply with *HI* anytime. 😊"
                };
                await _telegramService.SendTextMessage(chatId, thanksReply, branchId);
                return;
            }

            // ─── 3. Language Selection & Switching ───────────────────────────────
            bool isLanguageCommand = cleanText.Equals("/language", StringComparison.OrdinalIgnoreCase)
                                  || cleanText.Equals("/lang", StringComparison.OrdinalIgnoreCase)
                                  || cleanText.Equals("language", StringComparison.OrdinalIgnoreCase)
                                  || cleanText.Equals("भाषा", StringComparison.OrdinalIgnoreCase)
                                  || cleanText == "0";

            if (isLanguageCommand)
            {
                if (chatSession == null && patient != null && !string.IsNullOrEmpty(patient.Phone))
                {
                    chatSession = new ChatSession
                    {
                        PhoneNumber = NormalizationHelper.NormalizePhone(patient.Phone),
                        BranchId = branchId,
                    };
                    _context.ChatSessions.Add(chatSession);
                }

                if (chatSession != null)
                {
                    chatSession.CurrentState = "AWAITING_LANGUAGE";
                    await _context.SaveChangesAsync(default);
                }

                string langPrompt = lang switch
                {
                    "mr" => "🌐 *कृपया आपली भाषा निवडा:*\n\n1️⃣ हिन्दी (1 पाठवा)\n2️⃣ मराठी (2 पाठवा)\n3️⃣ English (3 पाठवा)",
                    "hi" => "🌐 *कृपया अपनी भाषा चुनें:*\n\n1️⃣ हिन्दी (1 भेजें)\n2️⃣ मराठी (2 भेजें)\n3️⃣ English (3 भेजें)",
                    _ => "🌐 *Please choose your language:*\n\n1️⃣ हिन्दी (Reply 1)\n2️⃣ मराठी (Reply 2)\n3️⃣ English (Reply 3)"
                };
                await _telegramService.SendTextMessage(chatId, langPrompt, branchId);
                return;
            }

            // If user previously requested language selection:
            if (chatSession != null && chatSession.CurrentState == "AWAITING_LANGUAGE")
            {
                if (cleanText == "1" || cleanText.StartsWith("1️⃣") || cleanText.Equals("hindi", StringComparison.OrdinalIgnoreCase) || cleanText.Equals("हिन्दी", StringComparison.OrdinalIgnoreCase) || cleanText.Equals("हिंदी", StringComparison.OrdinalIgnoreCase))
                {
                    lang = "hi";
                    chatSession.CurrentState = "START";
                    await SavePatientLanguage(patient, lang, branchId);
                    await _telegramService.SendTextMessage(chatId, "✅ भाषा *हिन्दी* चुन ली गई है।", branchId);
                }
                else if (cleanText == "2" || cleanText.StartsWith("2️⃣") || cleanText.Equals("marathi", StringComparison.OrdinalIgnoreCase) || cleanText.Equals("मराठी", StringComparison.OrdinalIgnoreCase))
                {
                    lang = "mr";
                    chatSession.CurrentState = "START";
                    await SavePatientLanguage(patient, lang, branchId);
                    await _telegramService.SendTextMessage(chatId, "✅ भाषा *मराठी* निवडली आहे.", branchId);
                }
                else if (cleanText == "3" || cleanText.StartsWith("3️⃣") || cleanText.Equals("english", StringComparison.OrdinalIgnoreCase))
                {
                    lang = "en";
                    chatSession.CurrentState = "START";
                    await SavePatientLanguage(patient, lang, branchId);
                    await _telegramService.SendTextMessage(chatId, "✅ Language set to *English*.", branchId);
                }
                else
                {
                    string invalidChoice = lang switch
                    {
                        "mr" => "कृपया योग्य पर्याय निवडा:\n1️⃣ हिन्दी\n2️⃣ मराठी\n3️⃣ English",
                        "hi" => "कृपया सही विकल्प चुनें:\n1️⃣ हिन्दी\n2️⃣ मराठी\n3️⃣ English",
                        _ => "Please select a valid option:\n1️⃣ हिन्दी\n2️⃣ मराठी\n3️⃣ English"
                    };
                    await _telegramService.SendTextMessage(chatId, invalidChoice, branchId);
                    return;
                }

                if (patient == null || string.IsNullOrWhiteSpace(patient.Phone))
                {
                    await RequestContact(branchId, chatId, lang);
                    return;
                }

                var existingActiveAfterLang = await GetExistingActiveToken(branchId, patient.Id);
                if (existingActiveAfterLang != null)
                {
                    await SendExistingBookingDetails(branchId, chatId, existingActiveAfterLang, lang);
                }
                else
                {
                    await SendWebAppButton(branchId, chatId, lang);
                }
                return;
            }

            // Direct language words (can be typed anytime)
            if (cleanText.Equals("hindi", StringComparison.OrdinalIgnoreCase) || cleanText.Equals("हिन्दी", StringComparison.OrdinalIgnoreCase) || cleanText.Equals("हिंदी", StringComparison.OrdinalIgnoreCase))
            {
                lang = "hi";
                if (chatSession != null) chatSession.CurrentState = "START";
                await SavePatientLanguage(patient, lang, branchId);
                await _telegramService.SendTextMessage(chatId, "✅ भाषा *हिन्दी* चुन ली गई है।", branchId);
                if (patient != null && !string.IsNullOrWhiteSpace(patient.Phone))
                {
                    var existing = await GetExistingActiveToken(branchId, patient.Id);
                    if (existing != null)
                    {
                        await SendExistingBookingDetails(branchId, chatId, existing, lang);
                        return;
                    }
                }
                await SendWebAppButton(branchId, chatId, lang);
                return;
            }
            else if (cleanText.Equals("marathi", StringComparison.OrdinalIgnoreCase) || cleanText.Equals("मराठी", StringComparison.OrdinalIgnoreCase))
            {
                lang = "mr";
                if (chatSession != null) chatSession.CurrentState = "START";
                await SavePatientLanguage(patient, lang, branchId);
                await _telegramService.SendTextMessage(chatId, "✅ भाषा *मराठी* निवडली आहे.", branchId);
                if (patient != null && !string.IsNullOrWhiteSpace(patient.Phone))
                {
                    var existing = await GetExistingActiveToken(branchId, patient.Id);
                    if (existing != null)
                    {
                        await SendExistingBookingDetails(branchId, chatId, existing, lang);
                        return;
                    }
                }
                await SendWebAppButton(branchId, chatId, lang);
                return;
            }
            else if (cleanText.Equals("english", StringComparison.OrdinalIgnoreCase))
            {
                lang = "en";
                if (chatSession != null) chatSession.CurrentState = "START";
                await SavePatientLanguage(patient, lang, branchId);
                await _telegramService.SendTextMessage(chatId, "✅ Language set to *English*.", branchId);
                if (patient != null && !string.IsNullOrWhiteSpace(patient.Phone))
                {
                    var existing = await GetExistingActiveToken(branchId, patient.Id);
                    if (existing != null)
                    {
                        await SendExistingBookingDetails(branchId, chatId, existing, lang);
                        return;
                    }
                }
                await SendWebAppButton(branchId, chatId, lang);
                return;
            }

            // ─── 4. Cancellation Commands ─────────────────────────────────────────
            if (cleanText.Equals("cancel", StringComparison.OrdinalIgnoreCase) || cleanText.Equals("/cancel", StringComparison.OrdinalIgnoreCase) || cleanText.Contains("रद्द"))
            {
                if (patient != null)
                {
                    var existingActive = await GetExistingActiveToken(branchId, patient.Id);
                    if (existingActive != null)
                    {
                        await PromptCancelAppointment(branchId, chatId, lang);
                        return;
                    }
                }
                string noActiveMsg = lang switch
                {
                    "mr" => "ℹ️ रद्द करण्यासाठी कोणतीही सक्रिय अपॉइंटमेंट आढळली नाही.",
                    "hi" => "ℹ️ कोई सक्रिय अपॉइंटमेंट नहीं मिली जिसे रद्द किया जा सके।",
                    _ => "ℹ️ No active appointment found to cancel."
                };
                await _telegramService.SendTextMessage(chatId, noActiveMsg, branchId);
                return;
            }

            // ─── 5. Admin / Direct Form Override ──────────────────────────────────
            if (cleanText.Equals("/form", StringComparison.OrdinalIgnoreCase))
            {
                await SendWebAppButton(branchId, chatId, lang);
                return;
            }

            // ─── 6. Patient Onboarding (Contact Request) ──────────────────────────
            if (cleanText.Equals("/start", StringComparison.OrdinalIgnoreCase))
            {
                if (patient == null || string.IsNullOrWhiteSpace(patient.Phone))
                {
                    await RequestContact(branchId, chatId, lang);
                    return;
                }
            }

            if (patient == null || string.IsNullOrWhiteSpace(patient.Phone))
            {
                await RequestContact(branchId, chatId, lang);
                return;
            }

            // ─── 7. Existing Active Token Handling ────────────────────────────────
            var existingToken = await GetExistingActiveToken(branchId, patient.Id);
            if (existingToken != null)
            {
                if (cleanText == "3")
                {
                    await PromptCancelAppointment(branchId, chatId, lang);
                    return;
                }
                await SendExistingBookingDetails(branchId, chatId, existingToken, lang);
                return;
            }

            // ─── 8. New Booking Form ──────────────────────────────────────────────
            await SendWebAppButton(branchId, chatId, lang);
        }

        private async Task SavePatientLanguage(Patient? patient, string lang, Guid branchId)
        {
            if (patient == null) return;
            try
            {
                var dict = new Dictionary<string, object>();
                if (!string.IsNullOrEmpty(patient.MetaDataJson))
                {
                    try
                    {
                        using var doc = JsonDocument.Parse(patient.MetaDataJson);
                        foreach (var prop in doc.RootElement.EnumerateObject())
                        {
                            if (prop.NameEquals("language")) continue;
                            dict[prop.Name] = prop.Value.Clone();
                        }
                    }
                    catch { }
                }
                dict["language"] = lang;
                patient.MetaDataJson = JsonSerializer.Serialize(dict);

                if (!string.IsNullOrEmpty(patient.Phone))
                {
                    var phoneVars = NormalizationHelper.GetPhoneVariations(patient.Phone);
                    var normalizedPhone = NormalizationHelper.NormalizePhone(patient.Phone);
                    var chatSession = await _context.ChatSessions
                        .FirstOrDefaultAsync(s => (phoneVars.Contains(s.PhoneNumber) || s.PhoneNumber == normalizedPhone) && s.BranchId == branchId && !s.IsDeleted);
                    if (chatSession != null)
                    {
                        chatSession.Language = lang;
                    }
                }

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

            string cancelPrompt = lang switch
            {
                "mr" => "\n\n👉 अपॉइंटमेंट रद्द करण्यासाठी खालील बटणावर क्लिक करा किंवा *CANCEL* लिहा:",
                "hi" => "\n\n👉 अपॉइंटमेंट रद्द करने के लिए नीचे बटन दबाएं या *CANCEL* लिखें:",
                _ => "\n\n👉 To cancel this appointment, tap the button below or type *CANCEL*:"
            };

            string cancelBtnText = lang switch
            {
                "mr" => "❌ अपॉइंटमेंट रद्द करा",
                "hi" => "❌ अपॉइंटमेंट रद्द करें",
                _ => "❌ Cancel Appointment"
            };

            var payload = new
            {
                chat_id = chatId,
                text = msg + cancelPrompt,
                parse_mode = "Markdown",
                reply_markup = new
                {
                    inline_keyboard = new[]
                    {
                        new[]
                        {
                            new { text = cancelBtnText, callback_data = "cancel_appointment" }
                        }
                    }
                }
            };

            var url = $"https://api.telegram.org/bot{botToken}/sendMessage";
            var json = JsonSerializer.Serialize(payload);
            var content = new System.Net.Http.StringContent(json, System.Text.Encoding.UTF8, "application/json");
            var client = new System.Net.Http.HttpClient();
            await client.PostAsync(url, content);
        }

        private async Task PromptCancelAppointment(Guid branchId, string chatId, string lang)
        {
            var b = await _context.Branches.FirstOrDefaultAsync(br => br.Id == branchId);
            var bToken = b?.TelegramBotToken;
            if (string.IsNullOrWhiteSpace(bToken)) return;

            string promptText = lang switch
            {
                "mr" => "⚠️ *तुम्हाला खात्री आहे की तुम्ही तुमची अपॉइंटमेंट रद्द करू इच्छिता?*",
                "hi" => "⚠️ *क्या आप वाकई अपनी अपॉइंटमेंट रद्द करना चाहते हैं?*",
                _ => "⚠️ *Are you sure you want to cancel your appointment?*"
            };

            string yesText = lang switch
            {
                "mr" => "✅ हो, रद्द करा",
                "hi" => "✅ हाँ, रद्द करें",
                _ => "✅ Yes, Cancel"
            };

            string noText = lang switch
            {
                "mr" => "❌ नाही, राहू द्या",
                "hi" => "❌ नहीं, रहने दें",
                _ => "❌ No, Keep It"
            };

            var promptPayload = new
            {
                chat_id = chatId,
                text = promptText,
                parse_mode = "Markdown",
                reply_markup = new
                {
                    inline_keyboard = new[]
                    {
                        new[]
                        {
                            new { text = yesText, callback_data = "confirm_cancel" },
                            new { text = noText, callback_data = "abort_cancel" }
                        }
                    }
                }
            };
            var json = JsonSerializer.Serialize(promptPayload);
            var content = new System.Net.Http.StringContent(json, System.Text.Encoding.UTF8, "application/json");
            var client = new System.Net.Http.HttpClient();
            await client.PostAsync($"https://api.telegram.org/bot{bToken}/sendMessage", content);
        }

        private async Task HandleCallbackQuery(Guid branchId, Guid orgId, TelegramCallbackQuery cb)
        {
            var chatId = cb.Message?.Chat?.Id.ToString();
            if (string.IsNullOrEmpty(chatId)) return;

            var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == branchId);
            var botToken = branch?.TelegramBotToken;
            if (string.IsNullOrWhiteSpace(botToken)) return;

            var patient = await _context.Patients
                .FirstOrDefaultAsync(p => !p.IsDeleted && p.TelegramChatId == chatId);
            if (patient == null) return;

            string cbLang = "hi";
            if (!string.IsNullOrEmpty(patient.MetaDataJson))
            {
                try
                {
                    using var doc = JsonDocument.Parse(patient.MetaDataJson);
                    if (doc.RootElement.TryGetProperty("language", out var lProp))
                    {
                        var s = lProp.GetString();
                        if (!string.IsNullOrEmpty(s)) cbLang = NormalizeLanguage(s);
                    }
                }
                catch { }
            }
            else if (!string.IsNullOrEmpty(patient.Phone))
            {
                var phoneVars = NormalizationHelper.GetPhoneVariations(patient.Phone);
                var normalizedPhone = NormalizationHelper.NormalizePhone(patient.Phone);
                var s = await _context.ChatSessions.FirstOrDefaultAsync(cs => (phoneVars.Contains(cs.PhoneNumber) || cs.PhoneNumber == normalizedPhone) && cs.BranchId == branchId && !cs.IsDeleted);
                if (s != null && !string.IsNullOrEmpty(s.Language)) cbLang = NormalizeLanguage(s.Language);
            }

            var data = cb.Data?.Trim().ToLowerInvariant();

            if (data == "cancel_appointment")
            {
                await PromptCancelAppointment(branchId, chatId, cbLang);
                return;
            }

            if (data == "confirm_cancel")
            {
                var today = CodeX.Application.Common.Helpers.TimeHelper.GetBranchLocalToday(branch.Timezone);
                var tomorrow = today.AddDays(1);

                var activeToken = await _context.Tokens
                    .IgnoreQueryFilters()
                    .Include(t => t.Queue)
                    .Where(t => t.PatientId == patient.Id
                        && !t.IsDeleted
                        && t.Queue.BranchId == branchId
                        && t.Queue.QueueDate >= today
                        && t.Queue.QueueDate < tomorrow
                        && (t.Status == Domain.Enums.TokenStatus.Pending || t.Status == Domain.Enums.TokenStatus.Called))
                    .FirstOrDefaultAsync();

                if (activeToken != null)
                {
                    activeToken.Status = Domain.Enums.TokenStatus.Cancelled;
                    await _context.SaveChangesAsync(default);

                    string confirmText = cbLang switch
                    {
                        "mr" => "✅ *तुमची अपॉइंटमेंट रद्द करण्यात आली आहे.*\n\nनवीन बुकिंगसाठी कधीही *HI* पाठवा. 🙏",
                        "hi" => "✅ *आपकी अपॉइंटमेंट रद्द कर दी गई है।*\n\nनई बुकिंग के लिए कभी भी *HI* लिखकर भेजें। 🙏",
                        _ => "✅ *Your appointment has been cancelled successfully.*\n\nReply with *HI* anytime to book a new appointment. 🙏"
                    };

                    var confirmPayload = new
                    {
                        chat_id = chatId,
                        text = confirmText,
                        parse_mode = "Markdown"
                    };
                    var json = JsonSerializer.Serialize(confirmPayload);
                    var content = new System.Net.Http.StringContent(json, System.Text.Encoding.UTF8, "application/json");
                    var client = new System.Net.Http.HttpClient();
                    await client.PostAsync($"https://api.telegram.org/bot{botToken}/sendMessage", content);
                }
                else
                {
                    string noTokenText = cbLang switch
                    {
                        "mr" => "ℹ️ कोणतीही सक्रिय अपॉइंटमेंट आढळली नाही. नवीन बुकिंगसाठी *HI* पाठवा.",
                        "hi" => "ℹ️ कोई सक्रिय अपॉइंटमेंट नहीं मिली। नई बुकिंग के लिए *HI* भेजें।",
                        _ => "ℹ️ No active appointment found. Reply with *HI* to book an appointment."
                    };

                    var noTokenPayload = new
                    {
                        chat_id = chatId,
                        text = noTokenText
                    };
                    var json = JsonSerializer.Serialize(noTokenPayload);
                    var content = new System.Net.Http.StringContent(json, System.Text.Encoding.UTF8, "application/json");
                    var client = new System.Net.Http.HttpClient();
                    await client.PostAsync($"https://api.telegram.org/bot{botToken}/sendMessage", content);
                }
                return;
            }

            if (data == "abort_cancel")
            {
                string abortText = cbLang switch
                {
                    "mr" => "👍 तुमची अपॉइंटमेंट सुरक्षित आहे. धन्यवाद! 🙏",
                    "hi" => "👍 आपकी अपॉइंटमेंट सुरक्षित है। धन्यवाद! 🙏",
                    _ => "👍 Your appointment is safe. Thank you! 🙏"
                };

                var abortPayload = new
                {
                    chat_id = chatId,
                    text = abortText
                };
                var json = JsonSerializer.Serialize(abortPayload);
                var content = new System.Net.Http.StringContent(json, System.Text.Encoding.UTF8, "application/json");
                var client = new System.Net.Http.HttpClient();
                await client.PostAsync($"https://api.telegram.org/bot{botToken}/sendMessage", content);
                return;
            }
        }

        private async Task SendWebAppButton(Guid branchId, string chatId, string lang)
        {
            var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == branchId);
            var token = branch?.TelegramBotToken;
            if (string.IsNullOrWhiteSpace(token)) return;

            // Using Ngrok or your deployed frontend URL
            var host = Request.Headers["X-Forwarded-Host"].FirstOrDefault() ?? Request.Host.Value;
            var formId = Guid.NewGuid().ToString("N");
            var webAppUrl = $"https://{host}/telegram-form?branchId={branchId}&chatId={chatId}&lang={lang}&formId={formId}&v={DateTime.UtcNow.Ticks}";

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

        private async Task RequestContact(Guid branchId, string chatId, string lang = "hi")
        {
            var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == branchId);
            var token = branch?.TelegramBotToken;
            if (string.IsNullOrWhiteSpace(token)) return;

            string welcomeText = lang switch
            {
                "mr" => "नमस्कार! अपॉइंटमेंट बुक करण्यासाठी कृपया खालील बटण दाबून आपला फोन नंबर शेअर करा.",
                "en" => "Welcome! To book an appointment, please share your phone number with us by tapping the button below.",
                _ => "नमस्ते! अपॉइंटमेंट बुक करने के लिए कृपया नीचे दिए गए बटन को दबाकर अपना फोन नंबर साझा करें।"
            };

            string btnText = lang switch
            {
                "mr" => "📱 फोन नंबर शेअर करा",
                "en" => "📱 Share Phone Number",
                _ => "📱 फ़ोन नंबर साझा करें"
            };

            var payload = new
            {
                chat_id = chatId,
                text = welcomeText,
                reply_markup = new
                {
                    keyboard = new[]
                    {
                        new[]
                        {
                            new { text = btnText, request_contact = true }
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
        [JsonPropertyName("callback_query")]
        public TelegramCallbackQuery? CallbackQuery { get; set; }
    }

    public class TelegramCallbackQuery
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;
        public TelegramUser? From { get; set; }
        public TelegramMessage? Message { get; set; }
        [JsonPropertyName("data")]
        public string? Data { get; set; }
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






