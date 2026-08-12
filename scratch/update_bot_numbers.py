import sys
import re

file_path = r"D:\Projects\CodeX\DocAppointmentApp\DocAppointment\Backend\CodeX.Application\Features\WhatsApp\Commands\ProcessIncomingMessage\ProcessIncomingMessageCommand.cs"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove global commands and only allow "hi" / "hello"
global_commands_old = """            // Global Commands
            if (bodyLower == "help" || bodyLower == "menu") return await HandleHelp(session, cancellationToken);
            if (bodyLower == "language")
            {
                session.CurrentState = "LANGUAGE_SELECTION";
                return WhatsAppTranslationHelper.Get("3", "WELCOME_LANGUAGE", await GetHospitalName(request.BranchId, cancellationToken));
            }
            if (bodyLower == "status") return await HandleStatus(session, cancellationToken);
            if (bodyLower == "appointment") return await HandleAppointmentDetails(session, cancellationToken);
            if (bodyLower == "reschedule") return await HandleReschedule(session, cancellationToken);
            if (bodyLower == "cancel") return await HandleCancel(session, cancellationToken);
            if (bodyLower == "rejoin") return await HandleRejoin(session, cancellationToken);

            // Only allow "hi" or "hello" to reset the session. No other text commands allowed.
            if (bodyLower == "hi" || bodyLower == "hello")
            {
                ResetSession(session);
            }"""

global_commands_new = """            // Only allow "hi" or "hello" to reset the session. No other text commands allowed.
            if (bodyLower == "hi" || bodyLower == "hello")
            {
                ResetSession(session);
            }"""

if global_commands_old in content:
    content = content.replace(global_commands_old, global_commands_new)

# 2. Add SKIPPED_APPOINTMENT_MENU to the switch statement
switch_old = """                "AWAITING_NAME" => await HandleRegistration(session, body, cancellationToken),
                "ACTIVE_APPOINTMENT_MENU" => await HandleActiveAppointmentMenu(session, body, cancellationToken),"""
switch_new = """                "AWAITING_NAME" => await HandleRegistration(session, body, cancellationToken),
                "ACTIVE_APPOINTMENT_MENU" => await HandleActiveAppointmentMenu(session, body, cancellationToken),
                "SKIPPED_APPOINTMENT_MENU" => await HandleSkippedAppointmentMenu(session, body, cancellationToken),"""
if switch_old in content:
    content = content.replace(switch_old, switch_new)

# 3. In HandleStart, check for skipped appointment
check_active_old = """            if (activeToken != null)
            {
                session.CurrentState = "ACTIVE_APPOINTMENT_MENU";
                return WhatsAppTranslationHelper.Get(session.Language, "ACTIVE_APPOINTMENT",
                    activeToken.Queue.Doctor?.Name ?? "Unknown",
                    activeToken.TokenNumber.ToString());
            }

            var doctors = await GetAvailableDoctors(session.BranchId, ct);"""

check_active_new = """            if (activeToken != null)
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

            var doctors = await GetAvailableDoctors(session.BranchId, ct);"""

if check_active_old in content:
    content = content.replace(check_active_old, check_active_new)

# 4. Add HandleSkippedAppointmentMenu
skipped_menu_func = """
        private async Task<string> HandleSkippedAppointmentMenu(ChatSession session, string body, CancellationToken ct)
        {
            if (body == "1")
            {
                return await HandleRejoin(session, ct);
            }
            return WhatsAppTranslationHelper.Get(session.Language, "INVALID_INPUT");
        }
"""
if "private async Task<string> HandleActiveAppointmentMenu" in content:
    content = content.replace("private async Task<string> HandleActiveAppointmentMenu", skipped_menu_func + "\n        private async Task<string> HandleActiveAppointmentMenu")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("ProcessIncomingMessageCommand updated")

# Update Translations
trans_file = r"D:\Projects\CodeX\DocAppointmentApp\DocAppointment\Backend\CodeX.Application\Common\Helpers\WhatsAppTranslationHelper.cs"
with open(trans_file, 'r', encoding='utf-8') as f:
    t_content = f.read()

# English
t_content = t_content.replace('कभी भी *STATUS* लिखकर', 'कभी भी *1* लिखकर')
t_content = t_content.replace('कधीही *STATUS* लिहून', 'कधीही *1* लिहून')
t_content = t_content.replace('Reply with *STATUS* anytime', 'Reply with *1* anytime')

t_content = t_content.replace('कृपया *REJOIN* लिखकर', 'कृपया *1* लिखकर')
t_content = t_content.replace('कृपया *REJOIN* लिहून', 'कृपया *1* लिहून')
t_content = t_content.replace('reply with *REJOIN*', 'reply with *1*')

# Insert MISSED_APP_MENU translations
def insert_translation(lang_id, after_key, key, text):
    global t_content
    search_str = f'{{ "{after_key}",'
    # find the block for lang_id
    lang_marker = f'{{ "{lang_id}", new Dictionary<string, string>'
    start_idx = t_content.find(lang_marker)
    if start_idx == -1: return
    after_idx = t_content.find(search_str, start_idx)
    if after_idx == -1: return
    
    # find end of line
    eol_idx = t_content.find('},', after_idx) + 2
    insertion = f'\n                    {{ "{key}", "{text}" }},'
    t_content = t_content[:eol_idx] + insertion + t_content[eol_idx:]

insert_translation("1", "APPOINTMENT_MISSED_ALERT", "MISSED_APP_MENU", "⚠️ *अपॉइंटमेंट छूट गई* ⚠️\\n\\nआपकी Dr. {0} के साथ टोकन #{1} की अपॉइंटमेंट छूट गई है।\\n\\n👉 वापस लाइन में लगने के लिए *1* भेजें\\n👉 शुरुआत से शुरू करने के लिए *HI* भेजें")
insert_translation("2", "APPOINTMENT_MISSED_ALERT", "MISSED_APP_MENU", "⚠️ *अपॉइंटमेंट सुटली* ⚠️\\n\\nतुमची Dr. {0} यांच्यासोबत टोकन #{1} ची अपॉइंटमेंट सुटली आहे.\\n\\n👉 पुन्हा रांगेत लागण्यासाठी *1* पाठवा\\n👉 सुरुवातीपासून सुरू करण्यासाठी *HI* पाठवा")
insert_translation("3", "APPOINTMENT_MISSED_ALERT", "MISSED_APP_MENU", "⚠️ *APPOINTMENT MISSED* ⚠️\\n\\nYou missed your appointment for Token #{1} with Dr. {0}.\\n\\n👉 Send *1* to Rejoin the queue\\n👉 Send *HI* to start over")

with open(trans_file, 'w', encoding='utf-8') as f:
    f.write(t_content)

print("Translations updated")
