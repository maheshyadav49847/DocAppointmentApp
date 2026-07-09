namespace CodeX.Application.Common.Interfaces
{
    public interface IPaymentService
    {
        Task<string> CreateOrderAsync(decimal amount, string currency, string receiptId, Dictionary<string, string> notes);
        bool VerifySignature(string orderId, string paymentId, string signature);
        bool VerifyWebhookSignature(string webhookBody, string webhookSignature);
    }
}
