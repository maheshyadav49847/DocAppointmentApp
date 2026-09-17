using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using CodeX.Api.Authorization;
using CodeX.Domain.Constants;

namespace CodeX.Api.Controllers
{
    [Authorize]
    public class BranchesController : BaseApiController
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public BranchesController(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }
        [HttpGet("list")]
        public async Task<ActionResult<List<Branch>>> Get()
        {
            var query = _context.Branches.AsQueryable();

            if (_currentUserService.OrgId != Guid.Empty)
            {
                query = query.Where(b => b.OrganizationId == _currentUserService.OrgId);
            }

            if (_currentUserService.DoctorId.HasValue)
            {
                // Doctors only see branches they are assigned to
                query = query.Where(b => b.Doctors.Any(d => d.Id == _currentUserService.DoctorId.Value));
            }
            else
            {
                bool isOrgWideAdmin = _currentUserService.IsInRole("OrgAdmin") || _currentUserService.IsInRole("SuperAdmin");
                if (!isOrgWideAdmin && _currentUserService.TokenBranchId.HasValue && _currentUserService.TokenBranchId.Value != Guid.Empty)
                {
                    query = query.Where(b => b.Id == _currentUserService.TokenBranchId.Value);
                }
            }

            return await query.ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Branch>> Get(Guid id)
        {
            // Branch Isolation: strictly bound users (like Receptionists) can only view their TokenBranchId
            bool isOrgWideAdmin = _currentUserService.IsInRole("OrgAdmin") || _currentUserService.IsInRole("SuperAdmin");
            if (!isOrgWideAdmin && _currentUserService.TokenBranchId.HasValue && _currentUserService.TokenBranchId.Value != Guid.Empty && _currentUserService.TokenBranchId.Value != id)
            {
                return Forbid();
            }

            var branch = await _context.Branches
                .FirstOrDefaultAsync(b => b.Id == id);

            if (branch == null) return NotFound();

            // Ensure the branch belongs to the user's organization
            if (branch.OrganizationId != _currentUserService.OrgId && _currentUserService.OrgId != Guid.Empty)
            {
                return Forbid();
            }

            return branch;
        }

        [HttpGet("org/{orgId}")]
        public async Task<ActionResult<List<Branch>>> GetByOrg(string orgId)
        {
            if (!Guid.TryParse(orgId, out var parsedOrgId) || parsedOrgId == Guid.Empty)
            {
                // Graceful fallback to user's authorized branches if orgId is missing, undefined, or invalid
                return await Get();
            }

            // IDOR Protection: Ensure user can only see branches of their own organization
            if (parsedOrgId != _currentUserService.OrgId && _currentUserService.OrgId != Guid.Empty) return Forbid();

            var query = _context.Branches.Where(b => b.OrganizationId == parsedOrgId);

            bool isOrgWideAdmin = _currentUserService.IsInRole("OrgAdmin") || _currentUserService.IsInRole("SuperAdmin");

            // Branch Isolation: Only isolate non-admin roles (e.g. Receptionist) to their TokenBranchId
            if (!isOrgWideAdmin && _currentUserService.TokenBranchId.HasValue && _currentUserService.TokenBranchId.Value != Guid.Empty)
            {
                query = query.Where(b => b.Id == _currentUserService.TokenBranchId.Value);
            }

            return await query.ToListAsync();
        }

        private static string NormalizeString(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return string.Empty;
            return System.Text.RegularExpressions.Regex.Replace(value.Trim(), @"\s+", " ").ToLowerInvariant();
        }

        [HttpPost]
        [HasPermission(SystemPermissions.Branches.Add)]
        [CodeX.Api.Filters.CheckSubscriptionLimit(CodeX.Api.Filters.SubscriptionLimitType.Branches)]
        public async Task<ActionResult<Guid>> Create(Branch branch)
        {
            // Ensure the branch is created for the user's organization
            branch.OrganizationId = _currentUserService.OrgId;

            var errors = new Dictionary<string, string[]>();
            if (string.IsNullOrWhiteSpace(branch.Name)) errors.Add("Name", new[] { "Branch Name is required." });
            if (string.IsNullOrWhiteSpace(branch.Address)) errors.Add("Address", new[] { "Physical Address is required." });
            if (string.IsNullOrWhiteSpace(branch.WhatsAppNumber)) errors.Add("WhatsAppNumber", new[] { "WhatsApp Number is required." });
            if (string.IsNullOrWhiteSpace(branch.LogoBase64)) errors.Add("LogoBase64", new[] { "Branch Logo is required." });
            if (errors.Any()) return BadRequest(new { errors });

            // Fetch existing branches in the organization to perform normalized case and space-insensitive checks
            var existingOrgBranches = await _context.Branches
                .Where(b => b.OrganizationId == branch.OrganizationId && !b.IsDeleted)
                .ToListAsync();

            var normalizedName = NormalizeString(branch.Name);
            if (existingOrgBranches.Any(b => NormalizeString(b.Name) == normalizedName))
            {
                return BadRequest(new { message = $"A branch with the name '{branch.Name.Trim()}' already exists in your organization." });
            }

            var normalizedAddress = NormalizeString(branch.Address);
            if (existingOrgBranches.Any(b => NormalizeString(b.Address) == normalizedAddress))
            {
                return BadRequest(new { message = "A branch with this physical address already exists in your organization." });
            }

            if (!string.IsNullOrWhiteSpace(branch.WhatsAppNumber))
            {
                var waNumber = branch.WhatsAppNumber.Trim();
                var duplicateWaExists = await _context.Branches.AnyAsync(b => b.WhatsAppNumber == waNumber && !b.IsDeleted);
                if (duplicateWaExists)
                {
                    return BadRequest(new { message = $"The WhatsApp number '{waNumber}' is already registered with another branch." });
                }
            }

            if (!string.IsNullOrWhiteSpace(branch.TelegramBotToken))
            {
                var botToken = branch.TelegramBotToken.Trim();
                var duplicateBotExists = await _context.Branches.AnyAsync(b => b.TelegramBotToken == botToken && !b.IsDeleted);
                if (duplicateBotExists)
                {
                    return BadRequest(new { message = "This Telegram Bot Token is already registered with another branch." });
                }
            }

            branch.Status = "Active";
            branch.IsActive = true;

            _context.Branches.Add(branch);
            await _context.SaveChangesAsync(default);
            return branch.Id;
        }

        [HttpPut("{id}")]
        [HasPermission(SystemPermissions.Branches.Edit)]
        public async Task<IActionResult> Update(Guid id, Branch updatedBranch)
        {
            // Branch Isolation: OrgAdmin and SuperAdmin have org-wide branch access
            var isOrgAdminOrSuper = _currentUserService.IsInRole("OrgAdmin") || _currentUserService.IsInRole("SuperAdmin") || User.IsInRole("OrgAdmin") || User.IsInRole("SuperAdmin");
            if (!isOrgAdminOrSuper && _currentUserService.BranchId.HasValue && _currentUserService.BranchId.Value != Guid.Empty && _currentUserService.BranchId.Value != id)
            {
                return Forbid();
            }

            var branch = await _context.Branches
                .FirstOrDefaultAsync(b => b.Id == id);

            if (branch == null) return NotFound();

            if (string.Equals(branch.Status, "Closed", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "Closed branches cannot be modified." });
            }

            var errors = new Dictionary<string, string[]>();
            if (string.IsNullOrWhiteSpace(updatedBranch.Name)) errors.Add("Name", new[] { "Branch Name is required." });
            if (string.IsNullOrWhiteSpace(updatedBranch.Address)) errors.Add("Address", new[] { "Physical Address is required." });
            if (string.IsNullOrWhiteSpace(updatedBranch.WhatsAppNumber)) errors.Add("WhatsAppNumber", new[] { "WhatsApp Number is required." });
            if (string.IsNullOrWhiteSpace(updatedBranch.LogoBase64) && string.IsNullOrWhiteSpace(branch.LogoBase64)) errors.Add("LogoBase64", new[] { "Branch Logo is required." });
            if (errors.Any()) return BadRequest(new { errors });

            // Fetch existing branches in the organization to perform normalized case and space-insensitive checks
            var existingOrgBranches = await _context.Branches
                .Where(b => b.Id != id && b.OrganizationId == branch.OrganizationId && !b.IsDeleted)
                .ToListAsync();

            var normalizedName = NormalizeString(updatedBranch.Name);
            if (existingOrgBranches.Any(b => NormalizeString(b.Name) == normalizedName))
            {
                return BadRequest(new { message = $"Another branch with the name '{updatedBranch.Name.Trim()}' already exists in your organization." });
            }

            var normalizedAddress = NormalizeString(updatedBranch.Address);
            if (existingOrgBranches.Any(b => NormalizeString(b.Address) == normalizedAddress))
            {
                return BadRequest(new { message = "Another branch with this physical address already exists in your organization." });
            }

            if (!string.IsNullOrWhiteSpace(updatedBranch.WhatsAppNumber))
            {
                var waNumber = updatedBranch.WhatsAppNumber.Trim();
                var duplicateWaExists = await _context.Branches.AnyAsync(b => b.Id != id && b.WhatsAppNumber == waNumber && !b.IsDeleted);
                if (duplicateWaExists)
                {
                    return BadRequest(new { message = $"The WhatsApp number '{waNumber}' is already registered with another branch." });
                }
            }

            if (!string.IsNullOrWhiteSpace(updatedBranch.TelegramBotToken))
            {
                var botToken = updatedBranch.TelegramBotToken.Trim();
                var duplicateBotExists = await _context.Branches.AnyAsync(b => b.Id != id && b.TelegramBotToken == botToken && !b.IsDeleted);
                if (duplicateBotExists)
                {
                    return BadRequest(new { message = "This Telegram Bot Token is already registered with another branch." });
                }
            }

            // Handle Status
            if (!string.IsNullOrWhiteSpace(updatedBranch.Status))
            {
                if (string.Equals(updatedBranch.Status, "Closed", StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest(new { message = "To close a branch, please use the Branch Closure workflow after settling all dependencies." });
                }
                else if (string.Equals(updatedBranch.Status, "Inactive", StringComparison.OrdinalIgnoreCase))
                {
                    branch.Status = "Inactive";
                    branch.IsActive = false;
                }
                else
                {
                    branch.Status = "Active";
                    branch.IsActive = true;
                }
            }

            branch.Name = updatedBranch.Name.Trim();
            branch.Address = updatedBranch.Address.Trim();
            branch.WhatsAppNumber = updatedBranch.WhatsAppNumber.Trim();
            branch.WhatsAppDialCode = updatedBranch.WhatsAppDialCode ?? "+91";
            branch.Timezone = updatedBranch.Timezone ?? branch.Timezone;
            if (!string.IsNullOrWhiteSpace(updatedBranch.LogoBase64))
            {
                branch.LogoBase64 = updatedBranch.LogoBase64;
            }
            branch.TelegramBotToken = updatedBranch.TelegramBotToken;

            await _context.SaveChangesAsync(default);
            return NoContent();
        }

        [HttpGet("{id}/dependencies")]
        public async Task<ActionResult<BranchDependencySummary>> GetDependencies(Guid id)
        {
            var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == id);
            if (branch == null) return NotFound();

            if (branch.OrganizationId != _currentUserService.OrgId && _currentUserService.OrgId != Guid.Empty)
            {
                return Forbid();
            }

            // 1. Active Doctors assigned to this branch
            var activeDoctors = await _context.Doctors
                .Where(d => d.OrganizationId == branch.OrganizationId && !d.IsDeleted && d.Branches.Any(b => b.Id == id))
                .Select(d => d.Name)
                .ToListAsync();

            // 2. Active Sessions in this branch
            var activeSessions = await _context.Sessions
                .Where(s => s.BranchId == id && !s.IsDeleted && s.IsActive)
                .Select(s => s.SessionName)
                .ToListAsync();

            // 3. Active Staff assigned to this branch
            var activeStaff = await _context.Staff
                .Include(s => s.Role)
                .Where(s => s.BranchId == id && !s.IsDeleted && s.IsActive)
                .Select(s => new { s.FirstName, s.LastName, RoleName = s.Role != null ? s.Role.Name : "Staff" })
                .ToListAsync();

            var branchAdminsCount = activeStaff.Count(s =>
                s.RoleName.Equals("BranchAdmin", StringComparison.OrdinalIgnoreCase) ||
                s.RoleName.Equals("Branch Admin", StringComparison.OrdinalIgnoreCase));

            // 4. Pending / In-progress tokens for today
            var activeTokensCount = await _context.Tokens
                .Where(t => t.Queue.BranchId == id && !t.IsDeleted &&
                    (t.Status == Domain.Enums.TokenStatus.Pending ||
                     t.Status == Domain.Enums.TokenStatus.Called))
                .CountAsync();

            // 5. Unsettled invoices
            var unsettledInvoicesCount = await _context.Invoices
                .Where(i => i.BranchId == id && !i.IsDeleted && i.Status != Domain.Enums.InvoiceStatus.Paid)
                .CountAsync();

            var dependencies = new List<string>();
            if (activeDoctors.Count > 0)
                dependencies.Add($"{activeDoctors.Count} active doctor(s) assigned: {string.Join(", ", activeDoctors.Take(3))}{(activeDoctors.Count > 3 ? "..." : "")}");
            if (activeSessions.Count > 0)
                dependencies.Add($"{activeSessions.Count} active recurring OPD session(s) scheduled.");
            if (activeStaff.Count > 0)
                dependencies.Add($"{activeStaff.Count} active staff member(s) assigned (including {branchAdminsCount} Branch Admin).");
            if (activeTokensCount > 0)
                dependencies.Add($"{activeTokensCount} pending/in-progress queue token(s) today.");
            if (unsettledInvoicesCount > 0)
                dependencies.Add($"{unsettledInvoicesCount} invoice(s) with pending payments.");

            return Ok(new BranchDependencySummary
            {
                CanClose = dependencies.Count == 0,
                ActiveDoctorsCount = activeDoctors.Count,
                ActiveSessionsCount = activeSessions.Count,
                ActiveStaffCount = activeStaff.Count,
                BranchAdminsCount = branchAdminsCount,
                ActiveQueueTokensCount = activeTokensCount,
                UnsettledInvoicesCount = unsettledInvoicesCount,
                Dependencies = dependencies
            });
        }

        [HttpPost("{id}/close")]
        [HasPermission(SystemPermissions.Branches.Edit)]
        public async Task<IActionResult> CloseBranch(Guid id, [FromBody] CloseBranchRequest request)
        {
            var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == id);
            if (branch == null) return NotFound();

            if (branch.OrganizationId != _currentUserService.OrgId && _currentUserService.OrgId != Guid.Empty)
            {
                return Forbid();
            }

            if (string.Equals(branch.Status, "Closed", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "This branch is already closed." });
            }

            if (string.IsNullOrWhiteSpace(request?.ClosureRemark))
            {
                return BadRequest(new { message = "Closure remark is mandatory to close a branch." });
            }

            // Verify zero dependencies
            var hasActiveDoctors = await _context.Doctors.AnyAsync(d => d.OrganizationId == branch.OrganizationId && !d.IsDeleted && d.Branches.Any(b => b.Id == id));
            var hasActiveSessions = await _context.Sessions.AnyAsync(s => s.BranchId == id && !s.IsDeleted && s.IsActive);
            var hasActiveStaff = await _context.Staff.AnyAsync(s => s.BranchId == id && !s.IsDeleted && s.IsActive);
            var hasActiveTokens = await _context.Tokens.AnyAsync(t => t.Queue.BranchId == id && !t.IsDeleted &&
                (t.Status == Domain.Enums.TokenStatus.Pending ||
                 t.Status == Domain.Enums.TokenStatus.Called));
            var hasUnsettledInvoices = await _context.Invoices.AnyAsync(i => i.BranchId == id && !i.IsDeleted && i.Status != Domain.Enums.InvoiceStatus.Paid);

            if (hasActiveDoctors || hasActiveSessions || hasActiveStaff || hasActiveTokens || hasUnsettledInvoices)
            {
                return BadRequest(new { message = "Cannot close branch. All active doctors, sessions, staff, pending tokens, and unsettled invoices must be settled first." });
            }

            branch.Status = "Closed";
            branch.IsActive = false;
            branch.ClosureRemark = request.ClosureRemark.Trim();
            branch.ClosedAt = DateTime.UtcNow;
            if (Guid.TryParse(_currentUserService.UserId, out var parsedUserId))
            {
                branch.ClosedBy = parsedUserId;
            }

            await _context.SaveChangesAsync(default);
            return Ok(new { message = "Branch closed successfully.", branchId = id });
        }

        [HttpDelete("{id}")]
        [HasPermission(SystemPermissions.Branches.Delete)]
        public IActionResult Delete(Guid id)
        {
            return BadRequest(new { message = "Branch deletion is prohibited. Please use the Branch Closure workflow with dependency settlement." });
        }

        [HttpPost("telegram/test")]
        public async Task<IActionResult> TestTelegramConnection([FromBody] TelegramTestRequest request, [FromServices] IHttpClientFactory httpClientFactory)
        {
            if (string.IsNullOrWhiteSpace(request.Token))
            {
                return BadRequest("Token is required.");
            }

            try
            {
                using var client = httpClientFactory.CreateClient();
                // 1. GetMe
                var meResponse = await client.GetAsync($"https://api.telegram.org/bot{request.Token}/getMe");
                if (!meResponse.IsSuccessStatusCode)
                {
                    return BadRequest("Invalid Telegram Bot Token.");
                }
                var meJson = await meResponse.Content.ReadAsStringAsync();
                
                // 2. GetWebhookInfo
                var webhookResponse = await client.GetAsync($"https://api.telegram.org/bot{request.Token}/getWebhookInfo");
                var webhookJson = await webhookResponse.Content.ReadAsStringAsync();

                return Ok(new {
                    success = true,
                    bot = System.Text.Json.JsonSerializer.Deserialize<object>(meJson),
                    webhook = System.Text.Json.JsonSerializer.Deserialize<object>(webhookJson)
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error connecting to Telegram: {ex.Message}");
            }
        }

        [HttpPost("telegram/set-webhook")]
        public async Task<IActionResult> SetTelegramWebhook([FromBody] TelegramWebhookRequest request, [FromServices] IHttpClientFactory httpClientFactory)
        {
            if (string.IsNullOrWhiteSpace(request.Token) || string.IsNullOrWhiteSpace(request.WebhookUrl))
            {
                return BadRequest("Token and WebhookUrl are required.");
            }

            try
            {
                using var client = httpClientFactory.CreateClient();
                var url = $"https://api.telegram.org/bot{request.Token}/setWebhook?url={request.WebhookUrl}";
                var response = await client.GetAsync(url);
                var json = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    return BadRequest(new { message = "Failed to set webhook on Telegram.", details = json });
                }

                return Ok(new {
                    success = true,
                    result = System.Text.Json.JsonSerializer.Deserialize<object>(json)
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error setting webhook: {ex.Message}");
            }
        }
    }

    public class TelegramTestRequest
    {
        public string Token { get; set; } = string.Empty;
    }

    public class TelegramWebhookRequest
    {
        public string Token { get; set; } = string.Empty;
        public string WebhookUrl { get; set; } = string.Empty;
    }

    public class BranchDependencySummary
    {
        public bool CanClose { get; set; }
        public int ActiveDoctorsCount { get; set; }
        public int ActiveSessionsCount { get; set; }
        public int ActiveStaffCount { get; set; }
        public int BranchAdminsCount { get; set; }
        public int ActiveQueueTokensCount { get; set; }
        public int UnsettledInvoicesCount { get; set; }
        public List<string> Dependencies { get; set; } = new();
    }

    public class CloseBranchRequest
    {
        public string ClosureRemark { get; set; } = string.Empty;
    }
}
