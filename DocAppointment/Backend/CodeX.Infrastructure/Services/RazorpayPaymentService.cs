using CodeX.Application.Common.Interfaces;
using CodeX.Application.Common.Settings;
using Microsoft.Extensions.Options;
using Razorpay.Api;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace CodeX.Infrastructure.Services
{
    public class RazorpayPaymentService : IPaymentService
    {
        private readonly RazorpaySettings _settings;

        public RazorpayPaymentService(IOptions<RazorpaySettings> options)
        {
            _settings = options.Value;
        }

        public Task<string> CreateOrderAsync(decimal amount, string currency, string receiptId, Dictionary<string, string> notes)
        {
            RazorpayClient client = new RazorpayClient(_settings.KeyId, _settings.KeySecret);

            Dictionary<string, object> options = new Dictionary<string, object>
            {
                { "amount", (int)(amount * 100) }, // amount in the smallest currency unit
                { "currency", currency },
                { "receipt", receiptId },
                { "notes", notes }
            };

            Order order = client.Order.Create(options);
            return Task.FromResult(order["id"].ToString()!);
        }

        public bool VerifySignature(string orderId, string paymentId, string signature)
        {
            string payload = orderId + "|" + paymentId;
            string generatedSignature = GenerateHMAC(payload, _settings.KeySecret);

            return generatedSignature == signature;
        }

        public bool VerifyWebhookSignature(string webhookBody, string webhookSignature)
        {
            string generatedSignature = GenerateHMAC(webhookBody, _settings.WebhookSecret);
            return generatedSignature == webhookSignature;
        }

        private string GenerateHMAC(string payload, string secret)
        {
            byte[] secretBytes = Encoding.UTF8.GetBytes(secret);
            byte[] payloadBytes = Encoding.UTF8.GetBytes(payload);

            using (HMACSHA256 hmac = new HMACSHA256(secretBytes))
            {
                byte[] hashBytes = hmac.ComputeHash(payloadBytes);
                
                StringBuilder hex = new StringBuilder(hashBytes.Length * 2);
                foreach (byte b in hashBytes)
                {
                    hex.AppendFormat("{0:x2}", b);
                }
                
                return hex.ToString();
            }
        }
    }
}
