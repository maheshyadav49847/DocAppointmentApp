using CodeX.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace CodeX.Infrastructure.ExternalServices
{
    public class WhatsAppServiceResolver : IWhatsAppService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<WhatsAppServiceResolver> _logger;

        public WhatsAppServiceResolver(IServiceScopeFactory scopeFactory, ILogger<WhatsAppServiceResolver> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        private async Task<IWhatsAppService> ResolveServiceAsync(Guid branchId)
        {
            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
            var branch = await dbContext.Branches.FirstOrDefaultAsync(b => b.Id == branchId);
            var providerName = branch?.WhatsAppProvider ?? "Bridge";

            if (providerName == "MetaCloud")
            {
                return scope.ServiceProvider.GetRequiredService<MetaCloudWhatsAppService>();
            }
            else if (providerName == "Twilio")
            {
                return scope.ServiceProvider.GetRequiredService<TwilioWhatsAppService>();
            }
            
            return scope.ServiceProvider.GetRequiredService<BridgeWhatsAppService>();
        }

        public async Task SendDoctorArrivalAlert(string phoneNumber, string doctorName, Guid branchId)
        {
            var service = await ResolveServiceAsync(branchId);
            await service.SendDoctorArrivalAlert(phoneNumber, doctorName, branchId);
        }

        public async Task SendFeedbackRequest(string phoneNumber, string doctorName, Guid tokenId, Guid branchId)
        {
            var service = await ResolveServiceAsync(branchId);
            await service.SendFeedbackRequest(phoneNumber, doctorName, tokenId, branchId);
        }

        public async Task SendSessionCancelledAlert(string phoneNumber, string doctorName, Guid branchId)
        {
            var service = await ResolveServiceAsync(branchId);
            await service.SendSessionCancelledAlert(phoneNumber, doctorName, branchId);
        }

        public async Task SendSessionTransferredAlert(string phoneNumber, string doctorName, string newSessionName, int newTokenNumber, Guid branchId)
        {
            var service = await ResolveServiceAsync(branchId);
            await service.SendSessionTransferredAlert(phoneNumber, doctorName, newSessionName, newTokenNumber, branchId);
        }

        public async Task SendTemplatedMessage(string toPhoneNumber, string contentSid, string variablesJson, Guid branchId)
        {
            var service = await ResolveServiceAsync(branchId);
            await service.SendTemplatedMessage(toPhoneNumber, contentSid, variablesJson, branchId);
        }

        public async Task SendTextMessage(string toPhoneNumber, string message, Guid branchId)
        {
            var service = await ResolveServiceAsync(branchId);
            await service.SendTextMessage(toPhoneNumber, message, branchId);
        }

        public async Task SendUpcomingTurnAlert(string phoneNumber, int tokensLeft, Guid branchId)
        {
            var service = await ResolveServiceAsync(branchId);
            await service.SendUpcomingTurnAlert(phoneNumber, tokensLeft, branchId);
        }

        public async Task SendWelcomeMessage(string phoneNumber, string patientName, int tokenNumber, Guid branchId, int? estimatedWaitMinutes = null)
        {
            var service = await ResolveServiceAsync(branchId);
            await service.SendWelcomeMessage(phoneNumber, patientName, tokenNumber, branchId, estimatedWaitMinutes);
        }

        public async Task SendYourTurnAlert(string phoneNumber, int tokenNumber, Guid branchId)
        {
            var service = await ResolveServiceAsync(branchId);
            await service.SendYourTurnAlert(phoneNumber, tokenNumber, branchId);
        }

        public async Task<bool> TestConnection(string accountSid, string authToken, string fromNumber)
        {
            // Default to Bridge for direct testing, or implement logic to figure out which one is being tested.
            // Since this is generic, we'll try to resolve via bridge first or simply return true since this is a legacy Twilio method.
            using var scope = _scopeFactory.CreateScope();
            var service = scope.ServiceProvider.GetRequiredService<BridgeWhatsAppService>();
            return await service.TestConnection(accountSid, authToken, fromNumber);
        }
    }
}
