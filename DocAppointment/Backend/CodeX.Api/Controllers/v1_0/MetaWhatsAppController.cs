using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CodeX.Api.Controllers.v1_0
{
    [ApiController]
    [Route("api/v1.0/meta/whatsapp")]
    [Authorize]
    public class MetaWhatsAppController : ControllerBase
    {
        private readonly IApplicationDbContext _context;
        private readonly ILogger<MetaWhatsAppController> _logger;

        public MetaWhatsAppController(IApplicationDbContext context, ILogger<MetaWhatsAppController> logger)
        {
            _context = context;
            _logger = logger;
        }

        public class SaveCredentialsRequest
        {
            public Guid BranchId { get; set; }
            public string WabaId { get; set; } = string.Empty;
            public string PhoneNumberId { get; set; } = string.Empty;
            public string SystemUserToken { get; set; } = string.Empty;
        }

        [HttpPost("save-credentials")]
        public async Task<IActionResult> SaveCredentials([FromBody] SaveCredentialsRequest request)
        {
            // Optional: verify the user has access to this branch
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            // ... auth logic ...

            var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == request.BranchId);
            if (branch == null)
            {
                return NotFound("Branch not found");
            }

            branch.WhatsAppProvider = "MetaCloud";
            branch.MetaWabaId = request.WabaId;
            branch.MetaPhoneNumberId = request.PhoneNumberId;
            branch.MetaSystemUserToken = request.SystemUserToken;
            
            // To be secure, the frontend could just fetch the phone number ID from Meta and we'd store it.
            // But for this embedded signup MVP, we assume the frontend extracted these after OAuth.

            await _context.SaveChangesAsync(default);

            return Ok(new { success = true, message = "Meta WhatsApp credentials saved successfully." });
        }
    }
}
