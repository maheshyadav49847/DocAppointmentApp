using CodeX.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using System.Text.Json;
using CodeX.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System;

namespace CodeX.Api.Controllers
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/[controller]")]
    public class PaymentsController : ControllerBase
    {
        private readonly IPaymentService _paymentService;
        private readonly IApplicationDbContext _context;

        public PaymentsController(IPaymentService paymentService, IApplicationDbContext context)
        {
            _paymentService = paymentService;
            _context = context;
        }

        [Authorize]
        [HttpPost("create-order")]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest request)
        {
            if (request.Amount <= 0) return BadRequest("Amount must be greater than 0");

            var orderId = await _paymentService.CreateOrderAsync(request.Amount, "INR", request.ReceiptId ?? "receipt_1", request.Notes ?? new Dictionary<string, string>());
            return Ok(new { OrderId = orderId });
        }

        [Authorize]
        [HttpPost("verify-signature")]
        public IActionResult VerifySignature([FromBody] VerifySignatureRequest request)
        {
            bool isValid = _paymentService.VerifySignature(request.OrderId, request.PaymentId, request.Signature);
            if (isValid)
            {
                return Ok(new { Status = "Success" });
            }
            return BadRequest(new { Status = "Failed" });
        }

        [AllowAnonymous]
        [HttpPost("webhook")]
        public async Task<IActionResult> Webhook()
        {
            var signature = HttpContext.Request.Headers["X-Razorpay-Signature"].ToString();
            
            using var reader = new StreamReader(HttpContext.Request.Body, Encoding.UTF8);
            var body = await reader.ReadToEndAsync();

            bool isValid = _paymentService.VerifyWebhookSignature(body, signature);

            if (isValid)
            {
                using var document = JsonDocument.Parse(body);
                var root = document.RootElement;
                
                var eventId = root.TryGetProperty("id", out var idProp) ? idProp.GetString() : Guid.NewGuid().ToString();
                var eventType = root.TryGetProperty("event", out var eventProp) ? eventProp.GetString() : "unknown";

                var existingLog = await _context.IdempotencyLogs.FirstOrDefaultAsync(x => x.EventId == eventId);

                if (existingLog != null)
                {
                    // Already processed
                    return Ok();
                }

                // Process the webhook payload
                // e.g., Update subscription status, send email, etc.

                var newLog = new IdempotencyLog
                {
                    EventId = eventId ?? Guid.NewGuid().ToString(),
                    EventType = eventType ?? "unknown",
                    RequestBody = body,
                    IsProcessed = true,
                    ProcessedAt = DateTime.UtcNow
                };

                _context.IdempotencyLogs.Add(newLog);
                await _context.SaveChangesAsync(default);

                return Ok();
            }

            return BadRequest();
        }
    }

    public class CreateOrderRequest
    {
        public decimal Amount { get; set; }
        public string? ReceiptId { get; set; }
        public Dictionary<string, string>? Notes { get; set; }
    }

    public class VerifySignatureRequest
    {
        public string OrderId { get; set; } = string.Empty;
        public string PaymentId { get; set; } = string.Empty;
        public string Signature { get; set; } = string.Empty;
    }
}
