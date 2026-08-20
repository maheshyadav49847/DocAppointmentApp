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

            if (_currentUserService.DoctorId.HasValue)
            {
                // Doctors only see branches they are assigned to
                query = query.Where(b => b.Doctors.Any(d => d.Id == _currentUserService.DoctorId.Value));
            }
            // Branch Isolation (Use TokenBranchId to ignore X-Branch-Id header so we can list all ALLOWED branches)
            else if (_currentUserService.TokenBranchId.HasValue && _currentUserService.TokenBranchId.Value != Guid.Empty)
            {
                query = query.Where(b => b.Id == _currentUserService.TokenBranchId.Value);
            }

            return await query.ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Branch>> Get(Guid id)
        {
            // Branch Isolation: strictly bound users (like Receptionists) can only view their TokenBranchId
            if (_currentUserService.TokenBranchId.HasValue && _currentUserService.TokenBranchId.Value != Guid.Empty && _currentUserService.TokenBranchId.Value != id)
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
        public async Task<ActionResult<List<Branch>>> GetByOrg(Guid orgId)
        {
            // IDOR Protection: Ensure user can only see branches of their own organization
            if (orgId != _currentUserService.OrgId && _currentUserService.OrgId != Guid.Empty) return Forbid();

            var query = _context.Branches.Where(b => b.OrganizationId == orgId);

            // Branch Isolation (Use TokenBranchId to ignore X-Branch-Id header so we can list all ALLOWED branches)
            if (_currentUserService.TokenBranchId.HasValue && _currentUserService.TokenBranchId.Value != Guid.Empty)
            {
                query = query.Where(b => b.Id == _currentUserService.TokenBranchId.Value);
            }

            return await query.ToListAsync();
        }

        [HttpPost]
        [HasPermission(SystemPermissions.Branches.Add)]
        [CodeX.Api.Filters.CheckSubscriptionLimit(CodeX.Api.Filters.SubscriptionLimitType.Branches)]
        public async Task<ActionResult<Guid>> Create(Branch branch)
        {
            // Ensure the branch is created for the user's organization
            branch.OrganizationId = _currentUserService.OrgId;

            var errors = new Dictionary<string, string[]>();
            if (string.IsNullOrWhiteSpace(branch.Name)) errors.Add("Name", new[] { "Name is required." });
            if (string.IsNullOrWhiteSpace(branch.Address)) errors.Add("Address", new[] { "Address is required." });
            if (string.IsNullOrWhiteSpace(branch.WhatsAppNumber)) errors.Add("WhatsAppNumber", new[] { "WhatsApp Number is required." });
            if (errors.Any()) return BadRequest(new { errors });

            // Code-level check: Prevent duplicate branch name in same organization
            var name = branch.Name.Trim();
            var duplicateExists = await _context.Branches.AnyAsync(b => 
                b.OrganizationId == branch.OrganizationId && 
                b.Name.ToLower() == name.ToLower() && 
                !b.IsDeleted);

            if (duplicateExists)
            {
                return BadRequest(new { message = $"A branch with the name '{name}' already exists in your organization." });
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
                    return BadRequest(new { message = $"This Telegram Bot Token is already registered with another branch." });
                }
            }

            _context.Branches.Add(branch);
            await _context.SaveChangesAsync(default);
            return branch.Id;
        }

        [HttpPut("{id}")]
        [HasPermission(SystemPermissions.Branches.Edit)]
        public async Task<IActionResult> Update(Guid id, Branch updatedBranch)
        {
            // Branch Isolation
            if (_currentUserService.BranchId.HasValue && _currentUserService.BranchId.Value != Guid.Empty && _currentUserService.BranchId.Value != id)
            {
                return Forbid();
            }

            var branch = await _context.Branches
                .FirstOrDefaultAsync(b => b.Id == id);

            if (branch == null) return NotFound();

            var errors = new Dictionary<string, string[]>();
            if (string.IsNullOrWhiteSpace(updatedBranch.Name)) errors.Add("Name", new[] { "Name is required." });
            if (string.IsNullOrWhiteSpace(updatedBranch.Address)) errors.Add("Address", new[] { "Address is required." });
            if (string.IsNullOrWhiteSpace(updatedBranch.WhatsAppNumber)) errors.Add("WhatsAppNumber", new[] { "WhatsApp Number is required." });
            if (errors.Any()) return BadRequest(new { errors });

            var name = updatedBranch.Name.Trim();
            // Code-level check: Prevent duplicate branch name in same organization
            var duplicateExists = await _context.Branches.AnyAsync(b => 
                b.Id != id &&
                b.OrganizationId == branch.OrganizationId && 
                b.Name.ToLower() == name.ToLower() && 
                !b.IsDeleted);

            if (duplicateExists)
            {
                return BadRequest(new { message = $"Another branch with the name '{name}' already exists in your organization." });
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
                    return BadRequest(new { message = $"This Telegram Bot Token is already registered with another branch." });
                }
            }

            branch.Name = name;
            branch.Address = updatedBranch.Address;
            branch.WhatsAppNumber = updatedBranch.WhatsAppNumber;
            branch.IsActive = updatedBranch.IsActive;
            branch.LogoBase64 = updatedBranch.LogoBase64;
            branch.TelegramBotToken = updatedBranch.TelegramBotToken;

            await _context.SaveChangesAsync(default);
            return NoContent();
        }
        [HttpDelete("{id}")]
        [HasPermission(SystemPermissions.Branches.Delete)]
        public async Task<IActionResult> Delete(Guid id)
        {
            // Branch Isolation
            if (_currentUserService.BranchId.HasValue && _currentUserService.BranchId.Value != Guid.Empty && _currentUserService.BranchId.Value != id)
            {
                return Forbid();
            }

            var branch = await _context.Branches
                .FirstOrDefaultAsync(b => b.Id == id);

            if (branch == null) return NotFound();

            // Soft delete
            branch.IsDeleted = true;
            await _context.SaveChangesAsync(default);
            
            return NoContent();
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
}
